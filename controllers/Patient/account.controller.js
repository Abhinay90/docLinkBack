const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const patientModel = require("../../models/Patient.model");

// import sendOtp from "../../utils/sendOtp.utils";
const sendOtp = require("../../utils/sendOtp.utils");
const sendNotification = require("../../utils/sendNotification.utils");
const NotificationModel = require("../../models/Notification.model");
const PatientModel = require("../../models/Patient.model");
const createCronjob = require("../../utils/cronJobs.utils");

const routes = {};

routes.register = async (req, res) => {
  try {
    const { name, email, password, dob, phone, deviceToken } = req.body;

    console.log(req.body);

    const patientExist = await patientModel.findOne({ email });

    console.log(patientExist);

    if (patientExist) {
      console.log(patientExist.isVerifiy);
      if (!patientExist.isVerifiy) await patientModel.deleteOne({ email });
      else return res.status(400).json({ error: "Account already exists" });
    }

    if (!deviceToken) {
      return res.status(400).json({ error: "DeviceToken Is Required" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = Math.floor(100000 + Math.random() * 900000);
    const expressTime = new Date().getTime() + 10 * 60 * 1000;

    await sendOtp(email, name, otp);

    console.log(otp, expressTime);

    // const notificationMessage = "User Registered Succesfully";

    // const notification={
    //     title:"Resister title",
    //     body:notificationMessage,
    //     fcmToken:""
    // }

    // const notify = await sendNotification({
    //   type: "Resister title",
    //   body: notificationMessage,
    //   data:{},
    //   fcmToken: "",
    // });

    // if (!notify) console.log("notificaton does not sent", notify);

    // const notificationRes = await NotificationModel.create({
    //   type: "Registered",
    //   body: notificationMessage,
    //   data:{}
    // });

    // console.log(notificationRes);
    const patient = await patientModel.create({
      name,
      email,
      password: hashedPassword,
      dob,
      phone,
      verificcationCode: otp,
      deviceToken,
      codeExpire: expressTime,
    });

    res
      .status(201)
      .json({ msg: "Account created successfuly", result: patient });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: "Internal Server Error",
      errorDev: error.message,
    });
  }
};

routes.login = async (req, res) => {
  try {
    const { email, password, deviceToken } = req.body;

    const patient = await patientModel.findOne({ email });

    if (!patient) return res.status(404).json({ error: "Account not found" });

    if (!patient.isVerifiy)
      return res.status(400).json({ error: "Account not verified" });

    const validPassword = await bcrypt.compare(password, patient.password);
    if (!validPassword)
      return res.status(400).json({ error: "Invalid password" });

    patient.deviceToken = deviceToken;
    const logInPatient =await (await patient.save()).populate("cronJobs");

    console.log(logInPatient);


    patient?.cronJobs?.forEach((cronJob) => {
      console.log(cronJob);
      createCronjob({
        schedule: cronJob.schedule,
        task: cronJob.tasks,
        deviceToken:patient?.deviceToken,
      });
    });

    const token = jwt.sign({ id: patient._id }, process.env.JWT_KEY, {
      expiresIn: "1d",
    });

    const resfreshToken = jwt.sign(
      { id: patient._id },
      process.env.REFRESH_TOKEN_PRIVATE_KEY,
      {
        expiresIn: "1y",
      }
    );

    console.log(patient?.cronJobs.schedule);
    console.log(patient?.cronJobs.tasks);
    console.log(patient?.deviceToken);

  

    // createCronjob({
    //   schedule: patient?.cronJobs?.schedule,
    //   task: patient?.cronJobs?.tasks,
    //   deviceToken: patient?.deviceToken,
    // });

    res
      .status(200)
      .json({ msg: "Logged in successfuly", result: { token, resfreshToken } });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Internal Server Error", errorDev: error.message });
  }
};

routes.verifyAccount = async (req, res) => {
  try {
    const { email, code } = req.body;

    const patient = await patientModel.findOne({ email });

    if (!patient) return res.status(404).json({ error: "Account not found" });

    if (!patient.deviceToken) console.log("device Token is required");

    if (patient.isVerifiy)
      return res.status(400).json({ error: "Account already verified" });
    console.log(patient.verificcationCode, code);
    if (patient.verificcationCode !== code)
      return res.status(400).json({ error: "Invalid verification code" });

    if (new Date() > patient.codeExpire)
      return res.status(400).json({ error: "Verification code expired" });

    patient.isVerifiy = true;

    const notificationMessage = "User Registered Succesfully";

    // const notify = await sendNotification({
    //   type: "Resister title",
    //   body: notificationMessage,
    //   data:{},
    //   fcmToken: "",
    // });

    const notificationRes = await NotificationModel.create({
      type: "Registered",
      body: notificationMessage,
      data: {},
      isRead: true,
    });

    patient.readNotifications.push([notificationRes._id]), await patient.save();

    const token = jwt.sign({ id: patient._id }, process.env.JWT_KEY, {
      expiresIn: "1d",
    });

    const resfreshToken = jwt.sign(
      { id: patient._id },
      process.env.REFRESH_TOKEN_PRIVATE_KEY,
      {
        expiresIn: "1y",
      }
    );

    const notify = await sendNotification({
      type: "Resistered",
      body: notificationMessage,
      data: {},
      deviceToken: patient.deviceToken,
    });

    res
      .status(200)
      .json({ msg: "Account verified", result: { token, resfreshToken } });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Internal Server Error", errorDev: error.message });
  }
};

routes.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const patient = await patientModel.findOne({ email });

    if (!patient) return res.status(404).json({ error: "Account not found" });

    const otp = Math.floor(100000 + Math.random() * 900000);

    await sendOtp(email, patient.name, otp);

    patient.verificcationCode = otp;
    patient.codeExpire = new Date().getTime() + 10 * 60 * 1000;

    await patient.save();

    res.status(200).json({
      msg: "Otp sent to your email",
      result: { code: otp },
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Internal Server Error", errorDev: error.message });
  }
};

routes.resetPassword = async (req, res) => {
  try {
    const { email, code, password } = req.body;

    const patient = await patientModel
      .findOne({ email })
      .select("verificcationCode codeExpire");

    if (!patient) return res.status(404).json({ error: "Account not found" });

    if (patient.verificcationCode !== code)
      return res.status(400).json({ error: "Invalid verification code" });

    if (new Date() > patient.codeExpire)
      return res.status(400).json({ error: "Verification code expired" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    patient.password = hashedPassword;
    patient.verificcationCode = null;
    patient.codeExpire = null;

    await patient.save();

    // jwt

    const token = jwt.sign({ id: patient._id }, process.env.JWT_KEY, {
      expiresIn: "1d",
    });

    const resfreshToken = jwt.sign(
      { id: patient._id },
      process.env.REFRESH_TOKEN_PRIVATE_KEY,
      {
        expiresIn: "1y",
      }
    );

    res.status(200).json({
      msg: "Password reset successfuly",
      result: { token, resfreshToken },
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Internal Server Error", errorDev: error.message });
  }
};

routes.refreshAccessToken = async (req, res) => {
  const refreshToken = req.body.refreshToken;

  if (!refreshToken)
    return res
      .status(404)
      .send({ error: "Access denied, refresh-token missing!" });

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_PRIVATE_KEY
    );

    const id = decoded.id;
    const accessToken = jwt.sign({ id }, process.env.JWT_KEY, {
      expiresIn: "1d",
    });
    res.status(201).send({
      msg: "success",
      result: accessToken,
    });
  } catch (e) {
    console.log(e);
    return res
      .status(422)
      .send({ error: "Invalid refresh token", errorDev: e.message });
  }
};

routes.updateDeviceToken = async (req, res) => {
  const { id } = req.params;
  const { deviceToken } = req.body;
  console.log(deviceToken);
  // console.log(deviceToken)
  const patient = await PatientModel.findByIdAndUpdate(
    id,
    { deviceToken: deviceToken },
    { new: true }
  );
  if (!patient) return res.status(404).send({ error: "!patient not found" });
  console.log(patient);
  // patient.deviceToken = deviceToken;
  // const data=await patient.save();
  res.status("200").json(patient);
};

module.exports = routes;
