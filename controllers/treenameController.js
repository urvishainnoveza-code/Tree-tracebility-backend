const Treename = require("../models/Treename");
const createTreename = async (req, res) => {
  try {
    const { treename } = req.body;
    const existingTreename = await Treename.findOne({ treename });
    if (existingTreename) {
      return res.status(400).json({
        success: false,
        message: "treename is already exist..",
      });
    }
    const tree = await Treename.create({ treename });
    res.status(201).json({
      success: true,
      message: "tree created succesfully",
      data: tree,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

 const getAllTreename = async (req, res) => {
  try {
    const trees = await Treename.find().sort({ treename: 1 });
    res.status(201).json({
      success: true,
      data: trees,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
 const getTreenameById = async (req, res) => {
  try {
    const treename = await Treename.findById(req.params.id);
    if (!treename) {
      return res.status(404).json({
        success: false,
        message: "tree not found",
      });
    }
    res.status(201).json({
      success: true,
      data: treename,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
 const updateTreename = async (req, res) => {
  try {
    const treename = await Treename.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!treename) {
      return res.status(404).json({
        success: false,
        message: "tree name not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "tree name updated successfully",
      data: treename,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

 const deleteTreename = async (req, res) => {
  try {
    const treename = await Treename.findByIdAndDelete(req.params.id);

    if (!treename) {
      return res.status(404).json({
        success: false,
        message: "tree name not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "tree name deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
module.exports = { createTreename, getAllTreename, getTreenameById, updateTreename, deleteTreename };