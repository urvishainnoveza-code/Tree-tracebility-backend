const mongoose = require("mongoose");
const State = require("../models/State");


const isSuperAdmin = (req) => {
  return req?.user?.role?.name === "superAdmin";
};


const addState = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({
        status: 0,
        message: "Only SuperAdmin can add state",
      });
    }

    const { name, country } = req.body;

    if (!name || !country) {
      return res.status(400).json({
        status: 0,
        message: "Name and country are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(country)) {
      return res.status(400).json({
        status: 0,
        message: "Invalid country ID",
      });
    }

    const existing = await State.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
      country,
    });

    if (existing) {
      return res.status(409).json({
        status: 0,
        message: "State already exists",
      });
    }

    const created = await State.create({
      name: name.trim(),
      country,
    });

    const state = await State.findById(created._id)
      .populate("country", "_id name");


    return res.status(201).json({
      status: 1,
      message: "State added successfully",
      data: state,
    });

  } catch (error) {
    console.error("Add State Error:", error);
    return res.status(500).json({
      status: 0,
      message: "Internal Server Error",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get All States
|--------------------------------------------------------------------------
*/

const getAllState = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", country } = req.query;

    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.max(parseInt(limit), 1);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (country && mongoose.Types.ObjectId.isValid(country)) {
      filter.country = country;
    }

const [states, totalCount] = await Promise.all([
  State.find(filter)
    .populate("country", "_id name")   // 🔥 THIS LINE ADDED
    .sort({ name: 1 })
    .collation({ locale: "en", strength: 1 })
    .skip(skip)
    .limit(limitNum),

  State.countDocuments(filter),
]);


    return res.status(200).json({
      status: 1,
      message: "States fetched successfully",
      totalCount,
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      data: states,
    });
  } catch (error) {
    console.error("Get All States Error:", error);
    return res.status(500).json({
      status: 0,
      message: "Internal Server Error",
    });
  }
};

/*-------------------------------Get State By ID*/


const getStateById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        status: 0,
        message: "Invalid state ID",
      });
    }

    const state = await State.findById(req.params.id)
    .populate("country", "_id name");

    if (!state) {
      return res.status(404).json({
        status: 0,
        message: "State not found",
      });
    }

    return res.status(200).json({
      status: 1,
      message: "State fetched successfully",
      data: state,
    });
  } catch (error) {
    console.error("Get State By ID Error:", error);
    return res.status(500).json({
      status: 0,
      message: "Internal Server Error",
    });
  }
};

/* Update State*/

const updateState = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({
        status: 0,
        message: "Only SuperAdmin can update state",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        status: 0,
        message: "Invalid state ID",
      });
    }

    const { name, country } = req.body;

    const state = await State.findById(req.params.id);

    if (!state) {
      return res.status(404).json({
        status: 0,
        message: "State not found",
      });
    }

    if (name) state.name = name.trim();
    if (country && mongoose.Types.ObjectId.isValid(country)) {
      state.country = country;
    }

    await state.save();

    const updatedState = await State.findById(state._id)
      .populate("country", "_id name");


    return res.status(200).json({
      status: 1,
      message: "State updated successfully",
      data: updatedState,
    });
  } catch (error) {
    console.error("Update State Error:", error);
    return res.status(500).json({
      status: 0,
      message: "Internal Server Error",
    });
  }
};

/*delete State*/ 

const deleteState = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({
        status: 0,
        message: "Only SuperAdmin can delete state",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        status: 0,
        message: "Invalid state ID",
      });
    }

    const state = await State.findById(req.params.id);

    if (!state) {
      return res.status(404).json({
        status: 0,
        message: "State not found",
      });
    }

    await state.deleteOne();

    return res.status(200).json({
      status: 1,
      message: "State deleted successfully",
    });
  } catch (error) {
    console.error("Delete State Error:", error);
    return res.status(500).json({
      status: 0,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  addState,
  getAllState,
  getStateById,
  updateState,
  deleteState,
};
