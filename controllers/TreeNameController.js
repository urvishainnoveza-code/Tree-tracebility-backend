const TreeName = require("../models/TreeName");
const mongoose = require("mongoose");

//  Add TreeNmae
const addTreeName = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        Status: 0,
        Message: "Tree name is required",
      });
    }

    const existing = await TreeName.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });

    if (existing) {
      return res.status(409).json({
        Status: 0,
        Message: "Tree name already exists",
      });
    }

    const created = await TreeName.create({
      name: name.trim(),
    });

    return res.status(201).json({
      Status: 1,
      Message: "Tree name added successfully",
      Data: created,
    });
  } catch (error) {
    console.error("Add TreeName Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
    });
  }
};
// Get All TreeName
const getAllTreeName = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.max(parseInt(limit), 1);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const [list, totalCount] = await Promise.all([
      TreeName.find(filter)
        .sort({ name: 1 })
        .collation({ locale: "en", strength: 1 })
        .skip(skip)
        .limit(limitNum),
      TreeName.countDocuments(filter),
    ]);

    return res.status(200).json({
      Status: 1,
      Message: "Tree names fetched successfully",
      Pagination: {
        totalCount,
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
      },
      Data: list,
    });
  } catch (error) {
    console.error("Get TreeNames Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
    });
  }
};
// Get TreeName By ID
const getTreeNameById = async (req, res) => {
  try {
    const tree = await TreeName.findById(req.params.id);

    if (!tree) {
      return res.status(404).json({
        Status: 0,
        Message: "Tree name not found",
      });
    }

    return res.status(200).json({
      Status: 1,
      Message: "Tree name fetched successfully",
      Data: tree,
    });
  } catch (error) {
    console.error("Get TreeName By ID Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
    });
  }
};

// Update TreeName
const updateTreeName = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        Status: 0,
        Message: "Tree name is required",
      });
    }

    const existing = await TreeName.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
      _id: { $ne: req.params.id },
    });

    if (existing) {
      return res.status(409).json({
        Status: 0,
        Message: "Tree name already exists",
      });
    }

    const updated = await TreeName.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true },
    );

    if (!updated) {
      return res.status(404).json({
        Status: 0,
        Message: "Tree name not found",
      });
    }

    return res.status(200).json({
      Status: 1,
      Message: "Tree name updated successfully",
      Data: updated,
    });
  } catch (error) {
    console.error("Update TreeName Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
    });
  }
};

//  Delete Tree Name
const deleteTreeName = async (req, res) => {
  try {
    const deleted = await TreeName.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        Status: 0,
        Message: "Tree name not found",
      });
    }

    return res.status(200).json({
      Status: 1,
      Message: "Tree name deleted successfully",
    });
  } catch (error) {
    console.error("Delete TreeName Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
    });
  }
};

module.exports = {
  addTreeName,
  getAllTreeName,
  getTreeNameById,
  updateTreeName,
  deleteTreeName,
};
