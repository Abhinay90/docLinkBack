const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const doctorModel = require("../models/Doctor.model");

const auth = async (req, res, next) => {
  try {
    if (!req.headers.authorization)
      return res.status(401).send({ error: "Unauthorized" });
    const token = req.headers.authorization.split(" ")[1];

    if (!token) return res.status(401).send({ error: "Unauthorized" });

    try {
      const data = jwt.verify(token, process.env.JWT_KEY);
      const id = data?.id;
      if (!mongoose.Types.ObjectId.isValid(id))
        return res.status(404).json({ error: "No user with that id" });
      const doctor = await doctorModel.findById(id);
      if (!doctor) return res.status(404).json({ error: "No doctor found" });
      req.userId = id;
      next();
    } catch (err) {
      console.log(err);
      return res
        .status(401)
        .json({ error: "Token expired, please log in again" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = auth;
