const asyncHandler = require("express-async-handler");
const Country = require("../models/Country");
const Role = require("../models/Role");
const addCountry = asyncHandler(async (req, res) => {
  const { countryName } = req.body;
  const roleDocs = await Role.find({ _id: { $in: req.user.role } });
  const isSuperAdmin = roleDocs.some((role) => role.name === "superAdmin");

  if (!isSuperAdmin) {
    return res.status(200).json({
      Status: 0,
      Message: "You are not authorized to add countries",
    });
  }

  const existingCountry = await Country.findOne({
    countryName: new RegExp(`^${countryName}$`, "i"),
  });
  if (existingCountry) {
    return res.status(200).json({
      Status: 0,
      Message: "Country already exists",
    });
  }

  const country = await Country.create({ countryName });

  if (country) {
    res.status(200).json({
      Status: 1,
      Message: "Country added Successfully",
      country,
    });
  } else {
    res.status(200).json({
      Status: 0,
      Message: "Something Went Wrong",
    });
  }
});
const getCountries = asyncHandler(async (req, res) => {
  const { page, limit, search = "" } = req.query;
  const skip = (page - 1) * limit;

  const filter = search ? { name: { $regex: search, $options: "i" } } : {};

  const countries = await Country.find(filter)
    .sort({ name: 1 })
    .collation({ locale: "en", strength: 1 })
    .limit(parseInt(limit))
    .skip(skip);

  const count = await Country.countDocuments(filter);

  if (countries.length > 0) {
    res.status(200).json({
      Status: 1,
      Message: "Country fetched Successfully",
      totalCount: count,
      countries,
    });
  } else {
    res.status(200).json({
      Status: 0,
      Message: "No countries found",
      totalCount: count,
      countries: [],
    });
  }
});
const getCountryById = asyncHandler(async (req, res) => {
  const country = await Country.findById(req.params.id);

  if (country) {
    res.status(200).json({
      Status: 1,
      Message: "Country fetched successfully",
      country,
    });
  } else {
    res.status(200).json({
      Status: 0,
      Message: "Country not found",
    });
  }
});

const deleteCountry = asyncHandler(async (req, res) => {
  const roleDocs = await Role.find({ _id: { $in: req.user.role } });

  const isSuperAdmin = roleDocs.some((role) => role.name === "SuperAdmin");

  if (!isSuperAdmin) {
    return res.status(200).json({
      Status: 0,
      Message: "You are not authorized to delete countries",
    });
  }

  const country = await Country.findById(req.params.id);

  if (country) {
    await country.deleteOne();
    res.status(200).json({
      Status: 1,
      Message: "Country Deleted Successfully",
    });
  } else {
    res.status(200).json({
      Status: 0,
      Message: "Country Not Found",
    });
  }
});

module.exports = { addCountry, getCountries, getCountryById, deleteCountry };
