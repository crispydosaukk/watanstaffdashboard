import * as OfferModel from "../../models/PromotionalOfferModel.js";

export async function index(req, res) {
  try {
    const roleId = req.user.role_id;
    const roleName = req.user.role || req.user.role_title || "";
    const isSuperAdmin = (Number(roleId) === 6) || (roleName.toLowerCase() === "super admin");

    // If not super admin, filter by the current user's ID
    const userId = isSuperAdmin ? null : req.user.id;

    const data = await OfferModel.getAllOffers(userId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function store(req, res) {
  try {
    const { title, description, status, targets } = req.body;
    const userId = req.user.id;

    let banner_image = null;
    if (req.file) {
      banner_image = req.file.filename;
    }

    const parsedTargets = targets ? JSON.parse(targets) : [];

    const offerId = await OfferModel.createOffer({
      user_id: userId,
      title,
      description,
      banner_image,
      status
    }, parsedTargets);

    res.status(201).json({ id: offerId, message: "Offer created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function update(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, description, status, targets } = req.body;

    let banner_image = null;
    if (req.file) {
      banner_image = req.file.filename;
    }

    const parsedTargets = targets ? JSON.parse(targets) : null;

    await OfferModel.updateOffer(id, userId, {
      title,
      description,
      banner_image,
      status
    }, parsedTargets);

    res.json({ message: "Offer updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function toggleStatus(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { status } = req.body;
    const success = await OfferModel.updateOfferStatus(id, userId, status);
    if (!success) return res.status(403).json({ message: "Unauthorized or not found" });
    res.json({ message: "Status updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function destroy(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const success = await OfferModel.deleteOffer(id, userId);
    if (!success) return res.status(403).json({ message: "Unauthorized or not found" });
    res.json({ message: "Offer deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
