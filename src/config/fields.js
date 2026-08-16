// Field definitions (the Excel columns), gender codes and marketplace export templates.
// To add a new catalogue column: add one line to FIELDS. It appears in the form, table, export picker and import automatically.
export const FIELDS = [
  { key: "brand", label: "Brand", type: "brand", grp: "Identity" },
  { key: "sku", label: "Merchant SKU Code", type: "sku", grp: "Identity" },
  { key: "imageUrl", label: "Image URL", type: "url", grp: "Identity" },
  { key: "colour", label: "Vendor colour", type: "text", sku: "colour", grp: "Variant" },
  { key: "pattern", label: "Print and Pattern", type: "select", options: ["solid", "animal", "knit", "floral", "geometric", "striped", "checked", "abstract", "textured", "printed", "embroidered", "colourblock"], grp: "Variant" },
  { key: "size", label: "Vendor size", type: "text", def: "one size", grp: "Variant" },
  { key: "contents", label: "Package Contents", type: "text", grp: "Packaging" },
  { key: "packType", label: "Pack Type", type: "select", options: ["pack of 1", "pack of 2", "pack of 3", "pack of 4", "pack of 5", "pack of 6"], grp: "Packaging" },
  { key: "hsn", label: "HSN code", type: "text", grp: "Tax & price" },
  { key: "gst", label: "GST%", type: "number", step: "0.01", grp: "Tax & price" },
  { key: "landing", label: "Landing Price", type: "number", step: "0.01", grp: "Tax & price", price: true },
  { key: "mrp", label: "MRP", type: "number", step: "0.01", grp: "Tax & price", price: true },
  { key: "selling", label: "Selling Price", type: "number", step: "0.01", grp: "Tax & price", price: true },
  { key: "margin", label: "Margin %", type: "computed", grp: "Tax & price" },
  { key: "about", label: "About the product", type: "textarea", ai: true, grp: "Copy" },
  { key: "benefits", label: "Benefits & Special features", type: "textarea", ai: true, grp: "Copy" },
  { key: "ageGroup", label: "Age group", type: "select", options: ["adults-women", "adults-men", "adults-unisex", "teens", "kids-girls", "kids-boys", "kids-unisex", "infants"], grp: "Audience" },
  { key: "gender", label: "Gender", type: "select", options: ["female", "male", "unisex", "kids"], sku: "gender", grp: "Audience" },
  { key: "warranty", label: "Warranty Details", type: "text", grp: "Service" },
  { key: "care", label: "Care instructions", type: "text", grp: "Service" },
  { key: "material", label: "Material Detail", type: "text", sku: "material", grp: "Build" },
  { key: "compartment", label: "Compartment Detail", type: "text", grp: "Build" },
  { key: "laptop", label: "Laptop Compartment", type: "select", options: ["no", "yes"], grp: "Build" },
  { key: "height", label: "Height  (cm)", type: "number", step: "0.01", grp: "Dimensions" },
  { key: "width", label: "Width  (cm)", type: "number", step: "0.01", grp: "Dimensions" },
  { key: "length", label: "Length  (cm)", type: "number", step: "0.01", grp: "Dimensions" },
  { key: "weight", label: "Weight (amount)", type: "number", step: "0.01", grp: "Dimensions" },
  { key: "weightUnit", label: "Weight (unit)", type: "select", options: ["KILOGRAM", "GRAM"], grp: "Dimensions" },
  { key: "f1", label: "Feature 1", type: "text", ai: true, grp: "Copy" },
  { key: "f2", label: "Feature 2", type: "text", ai: true, grp: "Copy" },
  { key: "f3", label: "Feature 3", type: "text", ai: true, grp: "Copy" },
  { key: "water", label: "Water Resistance Level", type: "select", options: ["water resistant", "waterproof", "not water resistant"], grp: "Build" },
];
export const NON_TEMPLATE = ["landing", "mrp", "selling", "margin"]; // extra columns beyond the original 28
export const GENDER_CODES = { female: "W", male: "M", unisex: "U", kids: "K" };
export const GENDER_MEANING = { W: "Women", M: "Men", U: "Unisex", K: "Kids" };

export const MARKETPLACES = {
  ours: { name: "Standard (your template)", cols: null },
  amazon: { name: "Amazon India (flat file style)", cols: [
    ["item_sku", "sku"], ["brand_name", "brand"], ["item_name", "name"], ["main_image_url", "imageUrl"], ["color_name", "colour"], ["size_name", "size"], ["material_type", "material"],
    ["standard_price", "selling"], ["list_price", "mrp"], ["hsn_code", "hsn"], ["product_description", "about"], ["bullet_point1", "benefits"], ["bullet_point2", "f1"], ["bullet_point3", "f2"], ["bullet_point4", "f3"],
    ["target_gender", "gender"], ["age_range_description", "ageGroup"], ["item_height", "height"], ["item_width", "width"], ["item_length", "length"], ["item_weight", "weight"], ["item_weight_unit_of_measure", "weightUnit"],
    ["number_of_items", "packType"], ["water_resistance_level", "water"], ["warranty_description", "warranty"], ["care_instructions", "care"], ["pattern_type", "pattern"] ] },
  flipkart: { name: "Flipkart (listing sheet style)", cols: [
    ["Seller SKU ID", "sku"], ["Brand", "brand"], ["Model Name", "name"], ["Main Image URL", "imageUrl"], ["Color", "colour"], ["Size", "size"], ["Material", "material"],
    ["MRP", "mrp"], ["Your Selling Price", "selling"], ["HSN", "hsn"], ["Tax Code (GST)", "gst"], ["Description", "about"], ["Key Features", "benefits"], ["Sales Package", "contents"], ["Pack of", "packType"],
    ["Ideal For", "gender"], ["Height (cm)", "height"], ["Width (cm)", "width"], ["Length (cm)", "length"], ["Weight", "weight"], ["Weight Unit", "weightUnit"], ["Compartment", "compartment"], ["Laptop Sleeve", "laptop"], ["Water Resistant", "water"], ["Domestic Warranty", "warranty"], ["Pattern", "pattern"] ] },
  myntra: { name: "Myntra (catalog sheet style)", cols: [
    ["Vendor SKU Code", "sku"], ["Brand", "brand"], ["Product Name", "name"], ["Image URL", "imageUrl"], ["Vendor Colour", "colour"], ["Vendor Size", "size"], ["Material", "material"],
    ["MRP", "mrp"], ["Selling Price", "selling"], ["HSN Code", "hsn"], ["GST %", "gst"], ["Product Details", "about"], ["Special Features", "benefits"], ["Package Contents", "contents"], ["Pack Type", "packType"],
    ["Gender", "gender"], ["Age Group", "ageGroup"], ["Print & Pattern", "pattern"], ["Height (cm)", "height"], ["Width (cm)", "width"], ["Length (cm)", "length"], ["Weight", "weight"], ["Weight Unit", "weightUnit"], ["Compartment Detail", "compartment"], ["Care Instructions", "care"], ["Warranty", "warranty"], ["Water Resistance", "water"] ] },
};
