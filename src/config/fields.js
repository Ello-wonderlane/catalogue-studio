// Field definitions (the Excel columns), gender codes and marketplace export templates.
// To add a new catalogue column: add one line to FIELDS. It appears in the form, table, export picker and import automatically.
export const FIELDS = [
  { key: "brand", label: "Brand", type: "brand", grp: "Identity" },
  { key: "sku", label: "Merchant SKU Code", type: "sku", grp: "Identity" },
  { key: "imageUrl", label: "Image URL", type: "url", grp: "Identity" },
  { key: "imageUrl2", label: "Image URL 2", type: "url", grp: "Identity" },
  { key: "imageUrl3", label: "Image URL 3", type: "url", grp: "Identity" },
  { key: "imageUrl4", label: "Image URL 4", type: "url", grp: "Identity" },
  { key: "imageUrl5", label: "Image URL 5", type: "url", grp: "Identity" },
  { key: "videoUrl", label: "Video URL", type: "url", grp: "Identity" },
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
  { key: "skuSource", label: "SKU source", type: "computed", grp: "Tracking" },
  { key: "missing", label: "Missing fields", type: "computed", grp: "Tracking" },
  { key: "createdAt", label: "Added on", type: "date", grp: "Tracking" },
  { key: "updatedAt", label: "Updated on", type: "date", grp: "Tracking" },
];
// Extra helper columns understood by the importer / written by the template (not stored as separate fields):
export const HELPER_COLS = [["Department", "dept"], ["Category code", "categoryCode"], ["Style no.", "styleNo"]];
export const NON_TEMPLATE = ["landing", "mrp", "selling", "margin", "createdAt", "updatedAt", "imageUrl2", "imageUrl3", "imageUrl4", "imageUrl5", "videoUrl", "skuSource", "missing"]; // extra columns beyond the original 28
export const GENDER_CODES = { female: "W", male: "M", unisex: "U", kids: "K" };
export const GENDER_MEANING = { W: "Women", M: "Men", U: "Unisex", K: "Kids" };

export const MARKETPLACES = {
  ours: { name: "Standard (your template)", cols: null },
  amazon: { name: "Amazon India (flat file style)", cols: [
    ["item_sku", "sku"], ["brand_name", "brand"], ["item_name", "name"], ["main_image_url", "imageUrl"], ["other_image_url1", "imageUrl2"], ["other_image_url2", "imageUrl3"], ["other_image_url3", "imageUrl4"], ["other_image_url4", "imageUrl5"], ["product_video_url", "videoUrl"], ["color_name", "colour"], ["size_name", "size"], ["material_type", "material"],
    ["standard_price", "selling"], ["list_price", "mrp"], ["hsn_code", "hsn"], ["product_description", "about"], ["bullet_point1", "benefits"], ["bullet_point2", "f1"], ["bullet_point3", "f2"], ["bullet_point4", "f3"],
    ["target_gender", "gender"], ["age_range_description", "ageGroup"], ["item_height", "height"], ["item_width", "width"], ["item_length", "length"], ["item_weight", "weight"], ["item_weight_unit_of_measure", "weightUnit"],
    ["number_of_items", "packType"], ["water_resistance_level", "water"], ["warranty_description", "warranty"], ["care_instructions", "care"], ["pattern_type", "pattern"] ] },
  flipkart: { name: "Flipkart (listing sheet style)", cols: [
    ["Seller SKU ID", "sku"], ["Brand", "brand"], ["Model Name", "name"], ["Main Image URL", "imageUrl"], ["Other Image URL 1", "imageUrl2"], ["Other Image URL 2", "imageUrl3"], ["Other Image URL 3", "imageUrl4"], ["Other Image URL 4", "imageUrl5"], ["Video URL", "videoUrl"], ["Color", "colour"], ["Size", "size"], ["Material", "material"],
    ["MRP", "mrp"], ["Your Selling Price", "selling"], ["HSN", "hsn"], ["Tax Code (GST)", "gst"], ["Description", "about"], ["Key Features", "benefits"], ["Sales Package", "contents"], ["Pack of", "packType"],
    ["Ideal For", "gender"], ["Height (cm)", "height"], ["Width (cm)", "width"], ["Length (cm)", "length"], ["Weight", "weight"], ["Weight Unit", "weightUnit"], ["Compartment", "compartment"], ["Laptop Sleeve", "laptop"], ["Water Resistant", "water"], ["Domestic Warranty", "warranty"], ["Pattern", "pattern"] ] },
  myntra: { name: "Myntra (catalog sheet style)", cols: [
    ["Vendor SKU Code", "sku"], ["Brand", "brand"], ["Product Name", "name"], ["Image URL", "imageUrl"], ["Image URL 2", "imageUrl2"], ["Image URL 3", "imageUrl3"], ["Image URL 4", "imageUrl4"], ["Image URL 5", "imageUrl5"], ["Video URL", "videoUrl"], ["Vendor Colour", "colour"], ["Vendor Size", "size"], ["Material", "material"],
    ["MRP", "mrp"], ["Selling Price", "selling"], ["HSN Code", "hsn"], ["GST %", "gst"], ["Product Details", "about"], ["Special Features", "benefits"], ["Package Contents", "contents"], ["Pack Type", "packType"],
    ["Gender", "gender"], ["Age Group", "ageGroup"], ["Print & Pattern", "pattern"], ["Height (cm)", "height"], ["Width (cm)", "width"], ["Length (cm)", "length"], ["Weight", "weight"], ["Weight Unit", "weightUnit"], ["Compartment Detail", "compartment"], ["Care Instructions", "care"], ["Warranty", "warranty"], ["Water Resistance", "water"] ] },
  meesho: { name: "Meesho (catalog upload style)", cols: [
    ["Product ID / SKU", "sku"], ["Product Name", "name"], ["Image 1", "imageUrl"], ["Image 2", "imageUrl2"], ["Image 3", "imageUrl3"], ["Image 4", "imageUrl4"], ["Image 5", "imageUrl5"],
    ["MRP", "mrp"], ["Price", "selling"], ["HSN", "hsn"], ["GST %", "gst"], ["Colour", "colour"], ["Size", "size"], ["Fabric / Material", "material"], ["Pattern", "pattern"],
    ["Product Description", "about"], ["Key Features", "benefits"], ["Net Weight", "weight"], ["Weight Unit", "weightUnit"], ["Package Contents", "contents"], ["Ideal For", "gender"] ] },
  ajio: { name: "AJIO (vendor sheet style)", cols: [
    ["Vendor Article Number", "sku"], ["Brand", "brand"], ["Product Name", "name"], ["Image URL 1", "imageUrl"], ["Image URL 2", "imageUrl2"], ["Image URL 3", "imageUrl3"], ["Image URL 4", "imageUrl4"], ["Image URL 5", "imageUrl5"],
    ["MRP", "mrp"], ["Selling Price", "selling"], ["HSN Code", "hsn"], ["GST", "gst"], ["Colour", "colour"], ["Size", "size"], ["Material", "material"], ["Pattern", "pattern"],
    ["Product Description", "about"], ["Key Features", "benefits"], ["Gender", "gender"], ["Age Group", "ageGroup"], ["Care Instructions", "care"], ["Warranty", "warranty"],
    ["Height (cm)", "height"], ["Width (cm)", "width"], ["Length (cm)", "length"], ["Weight", "weight"], ["Weight Unit", "weightUnit"], ["Package Contents", "contents"] ] },
};

// What each marketplace will reject a row for. Approximate on purpose — platforms change their
// mandatory columns without notice, so treat this as a pre-flight check, not gospel, and confirm
// against the seller portal's own template. Build a custom format from their file for an exact match.
export const MARKET_REQUIRED = {
  amazon:   ["sku", "brand", "name", "imageUrl", "selling", "mrp", "hsn", "about", "benefits", "colour", "material", "gender"],
  flipkart: ["sku", "brand", "name", "imageUrl", "mrp", "selling", "hsn", "gst", "about", "colour", "size", "material", "contents"],
  myntra:   ["sku", "brand", "name", "imageUrl", "mrp", "selling", "hsn", "gst", "about", "colour", "size", "material", "gender"],
  meesho:   ["sku", "name", "imageUrl", "mrp", "selling", "hsn", "gst", "colour", "size", "material", "about"],
  ajio:     ["sku", "brand", "name", "imageUrl", "mrp", "selling", "hsn", "gst", "colour", "size", "material", "about", "gender"],
};

// Fields that must be filled for a product to count as "complete" (editable in Brands & SKU rules → Completeness)
export const DEFAULT_REQUIRED = ["sku", "imageUrl", "colour", "pattern", "size", "contents", "packType", "hsn", "gst", "mrp", "selling", "about", "benefits", "ageGroup", "gender", "warranty", "care", "material", "compartment", "laptop", "height", "width", "length", "weight", "weightUnit", "f1", "f2", "f3", "water"];
export const missingFields = (p, required) => required.filter((k) => k !== "brand" && String(p[k] ?? "").trim() === "").map((k) => FIELDS.find((f) => f.key === k)?.label || k);
// Extra "virtual" columns available when mapping marketplace templates
export const VIRTUAL_FIELDS = [["name", "Product name"], ["category", "Category name"], ["categoryCode", "Category code"], ["department", "Department"], ["styleNo", "Style no."], ["brandCode", "Brand code"]];
// Auto-mapping: marketplace header keyword → our field key (first match wins, checked top to bottom)
export const AUTOMAP = [
  [/(seller|vendor|merchant|item)[ _-]*sku|^sku|sku[ _-]*(id|code)/, "sku"], [/brand/, "brand"],
  [/main[ _-]*image|image[ _-]*url[ _-]*1|^image[ _-]*(url)?$|primary[ _-]*image|front[ _-]*image/, "imageUrl"],
  [/image.*2|other[ _-]*image.*1/, "imageUrl2"], [/image.*3|other[ _-]*image.*2/, "imageUrl3"], [/image.*4|other[ _-]*image.*3/, "imageUrl4"], [/image.*5|other[ _-]*image.*4/, "imageUrl5"], [/video/, "videoUrl"],
  [/colou?r/, "colour"], [/pattern|print/, "pattern"], [/size/, "size"], [/package[ _-]*content|sales[ _-]*package|what.*box|contents/, "contents"], [/pack[ _-]*(type|of)|number[ _-]*of[ _-]*items|quantity[ _-]*per/, "packType"],
  [/hsn/, "hsn"], [/gst|tax[ _-]*(code|rate)/, "gst"], [/landing|cost[ _-]*price|purchase[ _-]*price/, "landing"], [/mrp|maximum[ _-]*retail|list[ _-]*price/, "mrp"], [/selling|sale[ _-]*price|standard[ _-]*price|your[ _-]*price|offer[ _-]*price|^price$/, "selling"],
  [/description|about|product[ _-]*detail/, "about"], [/bullet.*1|key[ _-]*feature|benefit|special[ _-]*feature|highlight/, "benefits"], [/bullet.*2|feature[ _-]*1/, "f1"], [/bullet.*3|feature[ _-]*2/, "f2"], [/bullet.*4|feature[ _-]*3/, "f3"],
  [/age/, "ageGroup"], [/gender|ideal[ _-]*for|target/, "gender"], [/warranty/, "warranty"], [/care|wash/, "care"], [/material|fabric/, "material"], [/compartment|pocket/, "compartment"], [/laptop/, "laptop"],
  [/height/, "height"], [/width/, "width"], [/length|depth/, "length"], [/weight.*unit|unit.*weight/, "weightUnit"], [/weight/, "weight"], [/water/, "water"],
  [/product[ _-]*name|item[ _-]*name|title|model[ _-]*name|style[ _-]*name/, "name"], [/category|item[ _-]*type|product[ _-]*type|sub[ _-]*category/, "category"], [/department/, "department"], [/style[ _-]*(no|number|code)|model[ _-]*(no|number)/, "styleNo"],
];
