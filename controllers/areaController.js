const City = require("../models/City");
const Area = require("../models/Area");

const createArea = async (req, res) => {
  try {
    const { areaname, city } = req.body;

    const cityExists = await City.findById(city);
    if (!cityExists) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid city selected" });
    }

    const area = await Area.create({ areaname, city });

    res.status(201).json({
      success: true,
      message: "Area created successfully",
      data: area,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: "Area already exists in this city" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllAreas = async (req, res) => {
  try {
    const areas = await Area.find({ isActive: true })
      .populate({
        path: "city",
        select: "cityname",
      })
      .sort({ areaname: 1 });

    res.status(200).json({
      success: true,
      data: areas,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAreasByCity = async (req, res) => {
  try {
    const { cityId } = req.params;

    const areas = await Area.find({
      city: cityId,
      isActive: true,
    }).sort({ areaname: 1 });

    res.status(200).json({
      success: true,
      data: areas,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateArea = async (req, res) => {
  try {
    const { id } = req.params;
    const { areaname, city, isActive } = req.body;

    if (city) {
      const cityExists = await City.findById(city);
      if (!cityExists) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid city selected" });
      }
    }

    const updatedArea = await Area.findByIdAndUpdate(
      id,
      { areaname, city, isActive },
      { new: true, runValidators: true }
    );

    if (!updatedArea) {
      return res
        .status(404)
        .json({ success: false, message: "Area not found" });
    }

    res.status(200).json({
      success: true,
      message: "Area updated successfully",
      data: updatedArea,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteArea = async (req, res) => {
  try {
    const { id } = req.params;

    const area = await Area.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!area) {
      return res
        .status(404)
        .json({ success: false, message: "Area not found" });
    }

    res.status(200).json({
      success: true,
      message: "Area disabled successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createArea,
  getAllAreas,
  getAreasByCity,
  updateArea,
  deleteArea,
};


/*const Area = require("../models/Area");
const City = require("../models/City");

const createArea = async (req, res) => {
  try {
    const { areaname, city } = req.body;

    if (!areaname || !city) {
      return res.status(400).json({ success: false, message: "Area name and city are required" });
    }
    const cityExists = await City.findById(city);
    if (!cityExists) return res.status(400).json({ success: false, message: "Invalid city selected" });

    const area = await Area.create({ areaname, city, isActive: true });

    res.status(201).json({ success: true, message: "Area created successfully", data: area });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Area already exists in this city" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllAreas = async (req, res) => {
  try {
    const areas = await Area.find({ isActive: true })
      .populate({
        path: "city",
        select: "cityname state",
        populate: {
          path: "state",
          select: "statename country",
          populate: { path: "country", select: "countryname" },
        },
      })
      .sort({ areaname: 1 });

    res.status(200).json({ success: true, data: areas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAreasByCity = async (req, res) => {
  try {
    const { cityId } = req.params;

    const areas = await Area.find({ city: cityId, isActive: true })
      .populate({
        path: "city",
        select: "cityname state",
        populate: {
          path: "state",
          select: "statename country",
          populate: { path: "country", select: "countryname" },
        },
      })
      .sort({ areaname: 1 });

    res.status(200).json({ success: true, data: areas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateArea = async (req, res) => {
  try {
    const { id } = req.params;
    const { areaname, city, isActive } = req.body;

    const updatedArea = await Area.findByIdAndUpdate(
      id,
      { areaname, city, isActive },
      { new: true, runValidators: true }
    );

    if (!updatedArea) return res.status(404).json({ success: false, message: "Area not found" });

    res.status(200).json({ success: true, message: "Area updated successfully", data: updatedArea });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteArea = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedArea = await Area.findByIdAndUpdate(id, { isActive: false }, { new: true });

    if (!deletedArea) return res.status(404).json({ success: false, message: "Area not found" });

    res.status(200).json({ success: true, message: "Area deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createArea, getAllAreas, getAreasByCity, updateArea, deleteArea };*/

/*const Area = require("../models/Area");
const City = require("../models/City");

 const createArea = async (req, res) => {
  try {
    const { areaname, city } = req.body;

    if (!areaname || !city) {
      return res.status(400).json({
        success: false,
        message: "Area name and city are required",
      });
    }

    const cityExists = await City.findById(city);
    if (!cityExists) {
      return res.status(400).json({
        success: false,
        message: "Invalid city selected",
      });
    }

    const area = await Area.create({
      name: areaname,  
      city,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Area created successfully",
      data: area,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Area already exists in this city",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

 const getAreasByCity = async (req, res) => {
  try {
    const { cityId } = req.params;

    const areas = await Area.find({
      city: cityId,
      isActive: { $ne: false }, 
    })
      .populate({
        path: "city",
        select: "name",
        populate: {
          path: "state",
          select: "name",
          populate: {
            path: "country",
            select: "name",
          },
        },
      })
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: areas,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

 const updateArea = async (req, res) => {
  try {
    const { id } = req.params;

    const area = await Area.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!area) {
      return res.status(404).json({
        success: false,
        message: "Area not found",
      });
    }

    res.json({
      success: true,
      message: "Area updated successfully",
      data: area,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

 const deleteArea = async (req, res) => {
  try {
    const { id } = req.params;

    const area = await Area.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!area) {
      return res.status(404).json({
        success: false,
        message: "Area not found",
      });
    }

    res.json({
      success: true,
      message: "Area deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
module.exports = { createArea, getAreasByCity, updateArea, deleteArea };*/
