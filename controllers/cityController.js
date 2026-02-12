const State = require("../models/State");
const City = require("../models/City");

const createCity = async (req, res) => {
  try {
    const { cityname, state } = req.body;

    const stateExists = await State.findById(state);
    if (!stateExists) return res.status(400).json({ success: false, message: "Invalid state selected" });

    const city = await City.create({ cityname, state });

    res.status(201).json({ success: true, message: "City created successfully", data: city });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: "City already exists in this state" });
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllCities = async (req, res) => {
  try {
    const cities = await City.find({ status: true })
      .populate({
        path: "state",
        match: { status: true },
        select: "statename country",
        populate: { path: "country", match: { status: true }, select: "countryname" },
      })
      .sort({ cityname: 1 });

    const filteredCities = cities.filter(city => city.state !== null);

    res.status(200).json({ success: true, data: filteredCities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCitiesByState = async (req, res) => {
  try {
    const { stateId } = req.params;

    const cities = await City.find({ state: stateId, status: true })
      .populate({
        path: "state",
        select: "statename country",
        populate: { path: "country", select: "countryname" },
      })
      .sort({ cityname: 1 });

    res.status(200).json({ success: true, data: cities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCity = async (req, res) => {
  try {
    const { id } = req.params;
    const { cityname, state, status } = req.body;

    if (state) {
      const stateExists = await State.findById(state);
      if (!stateExists) return res.status(400).json({ success: false, message: "Invalid state selected" });
    }

    const updatedCity = await City.findByIdAndUpdate(id, { cityname, state, status }, { new: true, runValidators: true });
    if (!updatedCity) return res.status(404).json({ success: false, message: "City not found" });

    res.status(200).json({ success: true, message: "City updated successfully", data: updatedCity });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: "City already exists in this state" });
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCity = async (req, res) => {
  try {
    const { id } = req.params;
    const city = await City.findByIdAndUpdate(id, { status: false }, { new: true });
    if (!city) return res.status(404).json({ success: false, message: "City not found" });

    res.status(200).json({ success: true, message: "City disabled successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createCity, getAllCities, getCitiesByState, updateCity, deleteCity };
