const Country = require("../models/Country");
const State = require("../models/State");

const createState = async (req, res) => {
  try {
    const { statename, country } = req.body;

    if (!statename || !country) {
      return res.status(400).json({
        success: false,
        message: "State name and country are required",
      });
    }

    const countryExists = await Country.findById(country);
    if (!countryExists) {
      return res.status(400).json({
        success: false,
        message: "Invalid country selected",
      });
    }

    const state = await State.create({ statename, country });

    res.status(201).json({
      success: true,
      message: "State created successfully",
      data: state,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET STATES BY COUNTRY
const getStateByCountry = async (req, res) => {
  try {
    const { countryId } = req.params;

    const states = await State.find({
      country: countryId,
      status: true,
    })
      .populate("country", "countryname")
      .sort({ statename: 1 });

    res.status(200).json({
      success: true,
      data: states,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/*const getAllState = async (req, res) => {
  try {
    const states = await State.find({ status: true })
      .populate("country", "countryname")
      .sort({ statename: 1 });

    res.status(200).json({
      success: true,
      data: states,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};*/
const getAllState = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    const searchFilter = {
      status: true,
      ...(search && {
        statename: { $regex: search, $options: "i" },
      }),
    };

    const totalCount = await State.countDocuments(searchFilter);

    const states = await State.find(searchFilter)
      .populate("country", "countryname")
      .sort({ statename: 1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: states,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const updateState = async (req, res) => {
  try {
    const { id } = req.params;
    const { statename, country } = req.body;

    if (country) {
      const countryExists = await Country.findById(country);
      if (!countryExists) {
        return res.status(400).json({
          success: false,
          message: "Invalid country selected",
        });
      }
    }

    const updatedState = await State.findByIdAndUpdate(
      id,
      { statename, country },
      { new: true, runValidators: true }
    ).populate("country", "countryname");

    if (!updatedState) {
      return res.status(404).json({
        success: false,
        message: "State not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "State updated successfully",
      data: updatedState,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteState = async (req, res) => {
  try {
    const { id } = req.params;

    const state = await State.findByIdAndUpdate(
      id,
      { status: false },
      { new: true }
    );

    if (!state) {
      return res.status(404).json({
        success: false,
        message: "State not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "State disabled successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createState,
  getStateByCountry,
  getAllState,
  updateState,
  deleteState,
};
