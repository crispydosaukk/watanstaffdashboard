import jwt from "jsonwebtoken";
import * as StaffModel from "../../models/StaffModel.js";
import { getRestaurantByUserId } from "../../models/RestaurantModel.js";

// Super Admin: get ALL staff across all restaurants
export const getAllStaff = async (req, res) => {
  try {
    const staff = await StaffModel.listAllStaff();
    res.json({ status: 1, data: staff });
  } catch (err) {
    console.error("Get all staff error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

export const getStaff = async (req, res) => {
  try {
    const userId = req.user.id;
    const restaurant = await getRestaurantByUserId(userId);
    if (!restaurant) {
      return res.status(404).json({ status: 0, message: "Restaurant not found" });
    }

    const staff = await StaffModel.listStaff(restaurant.id);
    res.json({ status: 1, data: staff });
  } catch (err) {
    console.error("Get staff error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

export const createStaff = async (req, res) => {
  try {
    const userId = req.user.id;
    const restaurant = await getRestaurantByUserId(userId);
    if (!restaurant) {
      return res.status(404).json({ status: 0, message: "Restaurant not found" });
    }

    const data = req.body;
    data.restaurant_id = restaurant.id;
    
    if (req.file) {
      data.profile_image = req.file.filename;
    }

    const id = await StaffModel.createStaff(data);
    const newStaff = await StaffModel.getStaffById(id);
    
    res.status(201).json({ status: 1, message: "Staff member created", data: newStaff });
  } catch (err) {
    console.error("Create staff error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (req.file) {
      data.profile_image = req.file.filename;
    }

    const affected = await StaffModel.updateStaff(id, data);
    if (!affected && !req.file) {
      return res.status(404).json({ status: 0, message: "Staff member not found or no changes" });
    }

    const updated = await StaffModel.getStaffById(id);
    res.json({ status: 1, message: "Staff member updated", data: updated });
  } catch (err) {
    console.error("Update staff error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const affected = await StaffModel.deleteStaff(id);
    if (!affected) {
      return res.status(404).json({ status: 0, message: "Staff member not found" });
    }
    res.json({ status: 1, message: "Staff member deleted" });
  } catch (err) {
    console.error("Delete staff error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

export const staffLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ status: 0, message: "Email and password are required" });
    }

    const staff = await StaffModel.findStaffByEmail(email.toLowerCase().trim());

    if (!staff) {
      return res.status(401).json({ status: 0, message: "Invalid email or password" });
    }

    if (!staff.is_active) {
      return res.status(403).json({ status: 0, message: "Account deactivated contact admin" });
    }

    if (staff.password !== password) {
      return res.status(401).json({ status: 0, message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: staff.id, type: "staff", restaurant_id: staff.restaurant_id, email: staff.email },
      process.env.JWT_SECRET || "devsecret",
      { expiresIn: "30d" }
    );

    res.json({
      status: 1,
      message: "Login successful",
      data: {
        token,
        staff: {
          id: staff.id,
          employee_id: staff.employee_id,
          full_name: staff.full_name,
          email: staff.email,
          phone_number: staff.phone_number,
          gender: staff.gender,
          dob: staff.dob,
          designation: staff.designation,
          restaurant_id: staff.restaurant_id,
          restaurant_name: staff.restaurant_name,
          profile_image: staff.profile_image
        }
      }
    });
  } catch (err) {
    console.error("Staff login error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};
