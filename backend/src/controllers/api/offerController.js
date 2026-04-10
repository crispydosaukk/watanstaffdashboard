import * as OfferModel from "../../models/PromotionalOfferModel.js";
import db from "../../config/db.js";

function buildImageUrl(req, raw) {
  if (!raw) return null;
  let val = String(raw).trim();
  if (val.startsWith("http://") || val.startsWith("https://")) return val;
  val = val.replace(/^\.?\/?uploads\//, "");
  return `${req.protocol}://${req.get("host")}/uploads/${val}`;
}

export async function getActiveOffers(req, res) {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ status: 0, message: "user_id is required" });
    }

    const allOffers = await OfferModel.getAllOffers(user_id);
    const activeOffers = allOffers.filter(offer => offer.status === 'active');

    // Build full URLs for images and resolve target metadata
    const data = await Promise.all(activeOffers.map(async (offer) => {
      let cleanImage = offer.banner_image ? offer.banner_image.replace(/^\/?uploads\//, "") : null;
      
      // Resolve Target Metadata (Products and Categories)
      const resolvedTargets = await Promise.all((offer.targets || []).map(async (t) => {
        if (t.type === 'product') {
          const [p] = await db.query("SELECT * FROM products WHERE id = ?", [t.id]);
          if (p && p.length > 0) {
            return {
              ...t,
              name: p[0].product_name,
              image: buildImageUrl(req, p[0].product_image),
              price: p[0].product_price,
              discount_price: p[0].product_discount_price,
              description: p[0].product_description,
              contains: p[0].contains ? JSON.parse(p[0].contains) : []
            };
          }
        } else if (t.type === 'category') {
          const [cat] = await db.query("SELECT * FROM categories WHERE id = ?", [t.id]);
          if (cat && cat.length > 0) {
            return {
              ...t,
              name: cat[0].category_name,
              image: buildImageUrl(req, cat[0].category_image)
            };
          }
        }
        return t;
      }));

      return {
        ...offer,
        banner_image: cleanImage
          ? `${req.protocol}://${req.get("host")}/uploads/${cleanImage}`
          : null,
        targets: resolvedTargets
      };
    }));

    res.json({ status: 1, data });
  } catch (err) {
    res.status(500).json({ status: 0, message: err.message });
  }
}
