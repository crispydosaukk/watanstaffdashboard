import * as OfferModel from "../../models/PromotionalOfferModel.js";

export async function getActiveOffers(req, res) {
  try {
    const allOffers = await OfferModel.getAllOffers();
    // Filter to only return active ones for the mobile app
    const activeOffers = allOffers.filter(offer => offer.status === 'active');
    res.json({ status: 1, data: activeOffers });
  } catch (err) {
    res.status(500).json({ status: 0, message: err.message });
  }
}
