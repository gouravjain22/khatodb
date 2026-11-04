
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const User = require('../models/user.model');
const Otp = require('../models/otp.model');

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

const normalizeIndianPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  const tenDigits = digits.length === 12 && digits.startsWith('91')
    ? digits.slice(2)
    : digits;

  return /^[6-9]\d{9}$/.test(tenDigits) ? tenDigits : null;
};

const hashOtp = (phone, otp) => {
  const secret = process.env.OTP_HASH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('OTP_HASH_SECRET or JWT_SECRET must be configured.');

  return crypto
    .createHmac('sha256', secret)
    .update(`${phone}:${otp}`)
    .digest('hex');
};

const findUserByPhone = (phone) => User.findOne({
  phone: { $in: [phone, `+91${phone}`, `91${phone}`] },
});

// Send the existing backend-generated OTP through 2Factor.
const sendOtpVia2Factor = async (phone, otp) => {
  const apiKey = process.env.TWO_FACTOR_API_KEY;
  const templateName = process.env.TWO_FACTOR_TEMPLATE_NAME;

  if (!apiKey) {
    throw new Error('TWO_FACTOR_API_KEY is not configured.');
  }

  const phoneNumber = `+91${phone}`;

  let apiUrl =
    `https://2factor.in/API/V1/${encodeURIComponent(apiKey)}` +
    `/SMS/${encodeURIComponent(phoneNumber)}/${encodeURIComponent(otp)}`;

  // Add the approved custom template name if configured.
  if (templateName) {
    apiUrl += `/${encodeURIComponent(templateName)}`;
  }

  const response = await fetch(apiUrl);
  const result = await response.json();

  if (!response.ok || result.Status !== 'Success') {
    throw new Error(
      `2Factor OTP delivery failed: ${result.Details || response.status}`
    );
  }

  return result;
};

const sendOtp = async (req, res, next) => {
  let phone;

  try {
    phone = normalizeIndianPhone(req.body.phone);

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid 10-digit Indian mobile number.',
      });
    }

    // Do not reveal whether a phone number has an account.
    const user = await findUserByPhone(phone);

    if (user && user.status === 'active') {
      const otp = crypto.randomInt(100000, 1000000).toString();

      await Otp.findOneAndUpdate(
        { phone },
        {
          phone,
          otpHash: hashOtp(phone, otp),
          expiresAt: new Date(Date.now() + OTP_TTL_MS),
          attempts: 0,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      const deliveryMode = process.env.TWO_FACTOR_TEMPLATE_NAME;

      try {
        if (
          process.env.NODE_ENV !== 'production' &&
          deliveryMode === 'console'
        ) {
          console.log(`[Khato DEV OTP] +91${phone}: ${otp}`);
        } else if (deliveryMode === 'Khato') {
          await sendOtpVia2Factor(phone, otp);
          console.log(`[Khato DEV OTP] +91${phone}: ${otp}`);
        } else {
          throw new Error('OTP delivery mode is not configured.');
        }
      } catch (deliveryError) {
        // Never leave an OTP valid if SMS delivery failed.
        await Otp.deleteOne({ phone });

        console.error('OTP delivery error:', deliveryError.message);

        return res.status(502).json({
          success: false,
          message: 'Unable to send OTP. Please try again later.',
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'If this mobile number is registered, an OTP has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const phone = normalizeIndianPhone(req.body.phone);
    const otp = String(req.body.otp || '');

    if (!phone || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid mobile number and 6-digit OTP.',
      });
    }

    const otpRecord = await Otp.findOne({ phone }).select('+otpHash');

    if (!otpRecord || otpRecord.expiresAt.getTime() <= Date.now()) {
      if (otpRecord) await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(401).json({
        success: false,
        message: 'OTP is invalid or expired. Please request a new one.',
      });
    }

    if (otpRecord.attempts >= MAX_VERIFY_ATTEMPTS) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Please request a new OTP.',
      });
    }

    const suppliedHash = hashOtp(phone, otp);
    const expected = Buffer.from(otpRecord.otpHash, 'hex');
    const supplied = Buffer.from(suppliedHash, 'hex');
    const isValid = expected.length === supplied.length &&
      crypto.timingSafeEqual(expected, supplied);

    if (!isValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();

      return res.status(401).json({
        success: false,
        message: 'Incorrect OTP. Please try again.',
      });
    }

    const user = await findUserByPhone(phone);

    if (!user || user.status !== 'active') {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(401).json({
        success: false,
        message: 'Unable to authenticate this account.',
      });
    }

    await Otp.deleteOne({ _id: otpRecord._id });

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured.');
    }

    const token = jwt.sign(
      { sub: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          isAdmin: Boolean(user.isAdmin),
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendOtp, verifyOtp };
