const asyncHandler = require("express-async-handler");
const Role = require("../Models/role");
const PermissionGroup = require('../Models/PermissionGroup');
const { ObjectId } = require("mongoose").Types;

// Create Role
const addRole = asyncHandler(async (req, res) => {
  const { name, description, permissionGroups, business } = req.body;

  if (!name) {
    return res.status(200).json({
      Status: 0,
      Message: "Please provide a role name",
    });
  }

  const roleData = {
    name,
    description: description ,
    business: business ,
    addedby: req.user._id
  };

  // Accept permissionGroups as JSON string or array
  if (permissionGroups) {
    let pg = permissionGroups;
    if (typeof permissionGroups === 'string') {
      try {
        pg = JSON.parse(permissionGroups);
      } catch (err) {
        // If not valid JSON, ignore or return error
        return res.status(200).json({ Status: 0, Message: 'permissionGroups must be a JSON array' });
      }
    }
    // assign directly (assumes client provides objects with group and permissions ids)
    roleData.permissionGroups = pg;
  }

  const role = await Role.create(roleData);

  const populatedRole = await Role.findById(role._id);
  if (populatedRole) {
    res.status(200).json({
      Status: 1,
      Message: "Role added Successfully",
      role: populatedRole,
    });
  } else {
    res.status(200).json({
      Status: 0,
      Message: "Something Went Wrong",
    });
  }
});

// Get All Roles
const getRoles = asyncHandler(async (req, res) => {
  const { page, limit, search = "", business, default: defaultParam, addedby } = req.query;
  const skip = (page - 1) * limit;

  const filter = {
    name: { $ne: 'SuperAdmin' },
    // default: { $ne: false },
  };

    if (business) {
      filter.business = business;
    }else{
    if (addedby) {
      filter.addedby = addedby || req.user._id;
    }
    }

  if (search) {
    filter.name = {
      $regex: search,
      $options: 'i'
    };
  }
   if(defaultParam){
        if (String(defaultParam).toLowerCase() !== 'true') {
        filter.default = { $ne: true };
    }}

  const roles = await Role.find(filter)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

  const count = await Role.countDocuments(filter);

  if (roles.length > 0) {
    res.status(200).json({
      Status: 1,
      Message: "Role get Successfully",
      totalCount: count,
      roles,
    });
  } else {
    res.status(200).json({
      Status: 0,
      Message: "No roles found",
      totalCount: count,
      roles: [],
    });
  }
});

const getAllRoles = asyncHandler(async (req, res) => {
  const { page, limit, search = "",   business,addedby } = req.query;
  const skip = (page - 1) * limit;

  const filter = {

  };

  if (business) {
    filter.business = business;
  }else{
  if (addedby) {
    filter.addedby = addedby || req.user._id;
  }
  }


  if (search) {
    filter.name = {
      $regex: search,
      $options: 'i'
    };
  }

  const roles = await Role.find(filter)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

  const count = await Role.countDocuments(filter);

  if (roles.length > 0) {
    res.status(200).json({
      Status: 1,
      Message: "Role get Successfully",
      totalCount: count,
      roles,
    });
  } else {
    res.status(200).json({
      Status: 0,
      Message: "No roles found",
      totalCount: count,
      roles: [],
    });
  }
});

// Returns the role and all permission groups annotated with selection flags
const getRoleById = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id).lean();
  if (!role) {
    return res.status(200).json({ Status: 0, Message: 'Role not found' });
  }

  // Helper to normalize id from ObjectId or populated doc
  const getId = (thing) => {
    if (!thing && thing !== 0) return null;
    // strings
    if (typeof thing === 'string') return thing;
    // mongoose ObjectId has toHexString
    if (thing && typeof thing.toHexString === 'function') return thing.toHexString();
    // populated doc with _id
    if (thing && thing._id) return String(thing._id);
    try {
      return String(thing);
    } catch (e) {
      return null;
    }
  };

  // Build a map from role.permissionGroups for quick lookup
  // role.permissionGroups is expected to be an array of { group, permissions: [{ permission, allowedActions: [] }] }
  const roleMap = new Map();
  if (Array.isArray(role.permissionGroups)) {
    for (const rg of role.permissionGroups) {
      // rg can be several shapes:
      // - a plain group id (string/ObjectId)
      // - { group: id }
      // - { group: id, permissions: [ <permissionId> | { permission: id, allowedActions: [...] } ] }
      const gid = getId(rg.group || rg);
      if (!gid) continue;
      // special marker: '*' means all permissions/actions for this group
      let permMap = new Map();

      // if rg is primitive (group id alone), mark the whole group as all-selected
      if (typeof rg === 'string' || (rg && !rg.permissions && !rg.group)) {
        // group-only entry (no permissions array) -> select all
        roleMap.set(gid, '*');
        continue;
      }

      if (!rg.permissions) {
        // group object with no permissions -> select all
        roleMap.set(gid, '*');
        continue;
      }

      if (Array.isArray(rg.permissions)) {
        for (const p of rg.permissions) {
          // permission can be id or object
          const pid = getId(p.permission || p);
          if (!pid) continue;

          // if p is primitive (permission id) or allowedActions missing -> select all actions for this permission
          if (typeof p === 'string' || (!p.allowedActions && !p.allowedActions === false && !(Array.isArray(p.allowedActions) && p.allowedActions.length))) {
            permMap.set(pid, '*');
            continue;
          }

          // otherwise build set of allowed actions (may be empty -> treat as all)
          const actions = Array.isArray(p.allowedActions) ? p.allowedActions : [];
          if (actions.length === 0) {
            permMap.set(pid, '*');
          } else {
            const actionSet = new Set(actions.map(a => getId(a)).filter(Boolean));
            permMap.set(pid, actionSet);
          }
        }
      }

      roleMap.set(gid, permMap);
    }
  }

  // Load all permission groups with their permissions and actions
  const groups = await PermissionGroup.find().populate({
    path: 'permissions',
    populate: { path: 'actions' }
  }).lean();

  // Annotate groups
  const annotated = groups.map(g => {
    const gid = g._id.toString();
    const groupSelected = roleMap.has(gid);
    const permMap = roleMap.get(gid) || new Map();

    const permissions = (g.permissions || []).map(p => {
      const pid = p._id.toString();
      // permissionSelected logic supports three states of permMap:
      // - '*' means whole group selected -> every permission and action selected
      // - Map with pid -> '*' means all actions for that permission selected
      // - Map with pid -> Set of action ids
      let permissionSelected = false;
      let allowedActionSet = new Set();
      if (permMap === '*') {
        permissionSelected = true;
        // allowedActionSet left empty but we'll treat as all
        allowedActionSet = null; // null means all actions selected
      } else if (permMap && permMap.has && permMap.has(pid)) {
        const val = permMap.get(pid);
        if (val === '*') {
          permissionSelected = true;
          allowedActionSet = null;
        } else if (val instanceof Set) {
          permissionSelected = true;
          allowedActionSet = val;
        }
      }

      const actions = (p.actions || []).map(a => {
        const aid = getId(a._id || a);
        const isSelected = allowedActionSet === null ? true : allowedActionSet.has(aid);
        return { _id: a._id, name: a.name, isSelected };
      });

      return {
        _id: p._id,
        name: p.name,
        isSelected: permissionSelected,
        actions
      };
    });

    return {
      _id: g._id,
      name: g.name,
      isSelected: groupSelected,
      permissions
    };
  });

  role.permissionGroups = annotated;

  return res.status(200).json({
    Status: 1,
    Message: 'Role fetched successfully',
    role,
    // permissionGroups: annotated
  });
});

// Update Role
const updateRole = asyncHandler(async (req, res) => {
  const { name, description, permissionGroups } = req.body;
  console.log('Update Role - req.body:', req.body);

  const role = await Role.findById(req.params.id);

  if (!role) {
    return res.status(200).json({ Status: 0, Message: "Role Not Found" });
  }

  // Update fields
  role.name = name || role.name;
  role.description = description !== undefined ? description : role.description;

  // permissionGroups: accept JSON string or array
  if (typeof permissionGroups !== 'undefined') {
    let pg = permissionGroups;
    if (typeof permissionGroups === 'string') {
      try {
        pg = JSON.parse(permissionGroups);
      } catch (err) {
        return res.status(200).json({ Status: 0, Message: 'permissionGroups must be a JSON array' });
      }
    }
    role.permissionGroups = pg;
  }

  await role.save();
  const populatedRole = await Role.findById(role._id);
  console.log('Updated Role:', populatedRole);
  return res.status(200).json({ Status: 1, Message: 'Role Updated Successfully', role: populatedRole });
});

// Delete Role
const deleteRole = asyncHandler(async (req, res) => {

  const role = await Role.findById(req.params.id);

  if (role) {
    await role.deleteOne();
    res.status(200).json({
      Status: 1,
      Message: "Role Deleted Successfully",
    });
  } else {
    res.status(200).json({
      Status: 0,
      Message: "Role Not Found",
    });
  }
});



module.exports = {
  addRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
  getAllRoles
};

