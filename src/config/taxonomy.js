// Starting lists: fashion categories by department, material codes, colour codes and the default SKU rule.
// These are only defaults for a fresh install; the live lists are edited inside the app (Brands & SKU rules).
const T = (dept, name, code) => ({ dept, name, code });
export const DEFAULT_CATEGORIES = [
  // Bags & small leather goods (all departments)
  T("Bags", "Handbag / Shoulder bag", "HA"), T("Bags", "Tote bag", "TO"), T("Bags", "Sling / Crossbody", "SL"), T("Bags", "Clutch", "CL"),
  T("Bags", "Wallet", "WA"), T("Bags", "Card holder", "CH"), T("Bags", "Backpack", "BP"), T("Bags", "Laptop bag", "LB"), T("Bags", "Duffel / Gym bag", "DF"),
  T("Bags", "Pouch / Wristlet", "PO"), T("Bags", "Mobile case / phone bag", "MC"), T("Bags", "Combo set", "HAC"), T("Bags", "Travel trolley", "TR"), T("Bags", "Belt bag / Fanny pack", "FP"),
  // Women apparel
  T("Women", "Top / Blouse", "WTP"), T("Women", "Shirt", "WSH"), T("Women", "T-shirt", "WTS"), T("Women", "Kurta / Kurti", "WKU"), T("Women", "Dress", "WDR"),
  T("Women", "Jumpsuit", "WJS"), T("Women", "Co-ord set", "WCS"), T("Women", "Saree", "WSA"), T("Women", "Lehenga", "WLH"), T("Women", "Salwar suit", "WSS"),
  T("Women", "Jeans", "WJN"), T("Women", "Trousers", "WTR"), T("Women", "Skirt", "WSK"), T("Women", "Palazzo", "WPZ"), T("Women", "Leggings", "WLG"),
  T("Women", "Shorts", "WSO"), T("Women", "Sweater / Cardigan", "WSW"), T("Women", "Jacket / Coat", "WJK"), T("Women", "Blazer", "WBZ"),
  T("Women", "Lingerie / Innerwear", "WIN"), T("Women", "Sleepwear / Loungewear", "WSL"), T("Women", "Activewear", "WAC"), T("Women", "Swimwear", "WSM"),
  // Men apparel
  T("Men", "T-shirt", "MTS"), T("Men", "Shirt", "MSH"), T("Men", "Polo", "MPL"), T("Men", "Kurta", "MKU"), T("Men", "Jeans", "MJN"), T("Men", "Trousers / Chinos", "MTR"),
  T("Men", "Shorts", "MSO"), T("Men", "Track pants / Joggers", "MJG"), T("Men", "Sweatshirt / Hoodie", "MHD"), T("Men", "Jacket", "MJK"), T("Men", "Blazer / Suit", "MBZ"),
  T("Men", "Sweater", "MSW"), T("Men", "Ethnic set / Sherwani", "MET"), T("Men", "Innerwear", "MIN"), T("Men", "Sleepwear", "MSL"), T("Men", "Activewear", "MAC"),
  // Kids apparel
  T("Kids", "Frock / Dress", "KFR"), T("Kids", "T-shirt", "KTS"), T("Kids", "Shirt", "KSH"), T("Kids", "Romper / Onesie", "KRO"), T("Kids", "Dungaree", "KDG"),
  T("Kids", "Jeans / Trousers", "KTR"), T("Kids", "Shorts", "KSO"), T("Kids", "Ethnic wear", "KET"), T("Kids", "Nightwear", "KNW"), T("Kids", "Clothing set", "KCS"),
  T("Kids", "School bag", "KSB"), T("Kids", "Innerwear", "KIN"),
  // Footwear (all)
  T("Footwear", "Sneakers", "SN"), T("Footwear", "Sandals", "SD"), T("Footwear", "Flats / Ballerinas", "FL"), T("Footwear", "Heels", "HE"), T("Footwear", "Boots", "BT"),
  T("Footwear", "Loafers", "LO"), T("Footwear", "Formal shoes", "FS"), T("Footwear", "Flip-flops / Slippers", "FF"), T("Footwear", "Sports shoes", "SP"), T("Footwear", "Ethnic footwear / Jutti", "JT"),
  // Accessories (all)
  T("Accessories", "Belt", "BE"), T("Accessories", "Watch", "WT"), T("Accessories", "Sunglasses", "SG"), T("Accessories", "Cap / Hat", "CP"), T("Accessories", "Scarf / Stole", "SC"),
  T("Accessories", "Jewellery", "JW"), T("Accessories", "Hair accessory", "HR"), T("Accessories", "Socks", "SK"), T("Accessories", "Tie / Pocket square", "TI"), T("Accessories", "Gloves", "GL"),
  T("Accessories", "Keychain / Charm", "KC"), T("Accessories", "Umbrella", "UM"),
];
export const DEFAULT_MATERIALS = [
  { code: "P", name: "PU" }, { code: "L", name: "Leather" }, { code: "C", name: "Canvas" }, { code: "S", name: "Suede" }, { code: "N", name: "Nylon" },
  { code: "J", name: "Jute" }, { code: "F", name: "Fabric" }, { code: "D", name: "Denim" }, { code: "T", name: "Cotton" }, { code: "V", name: "Velvet" }, { code: "R", name: "Rubber" }, { code: "M", name: "Metal" },
];
// Colour codes are all distinct — no two colours share a code and no code is a plain 2-letter prefix that another colour could also claim.
export const DEFAULT_COLOURS = [
  { name: "Black", code: "BK" }, { name: "Blue", code: "BU" }, { name: "Beige", code: "BG" }, { name: "Brown", code: "BR" }, { name: "Burgundy", code: "BY" },
  { name: "White", code: "WT" }, { name: "Grey", code: "GY" }, { name: "Green", code: "GN" }, { name: "Gold", code: "GD" }, { name: "Silver", code: "SV" },
  { name: "Tan", code: "TN" }, { name: "Maroon", code: "MR" }, { name: "Mustard", code: "MU" }, { name: "Olive", code: "OL" }, { name: "Orange", code: "OR" },
  { name: "Pink", code: "PK" }, { name: "Peach", code: "PC" }, { name: "Purple", code: "PP" }, { name: "Red", code: "RD" }, { name: "Rust", code: "RS" },
  { name: "Yellow", code: "YL" }, { name: "Navy", code: "NV" }, { name: "Cream", code: "CR" }, { name: "Coral", code: "CO" }, { name: "Teal", code: "TL" }, { name: "Lavender", code: "LV" },
  { name: "Croco Black", code: "CB" }, { name: "Croco Brown", code: "CN" }, { name: "Croco Maroon", code: "CM" }, { name: "Croco Olive", code: "CV" }, { name: "Croco Yellow", code: "CY" },
  { name: "Multicolour", code: "MX" },
];
export const DEFAULT_SKU = {
  separator: "", styleDigits: 4,
  segments: [
    { id: "brand", label: "Brand", on: true }, { id: "gender", label: "Gender", on: true }, { id: "category", label: "Category", on: true },
    { id: "style", label: "Style no.", on: true }, { id: "material", label: "Material", on: true }, { id: "colour", label: "Colour", on: true },
  ],
};
export const SEG_COLORS = { brand: "#7A2C2A", gender: "#B8975F", category: "#4A5637", style: "#17181A", material: "#5B4A8A", colour: "#2E6E8E" };
export const SEG_HELP = { brand: "brand code (e.g. YS = Yselle)", gender: "W Women · M Men · U Unisex · K Kids", category: "category code (e.g. HA handbag, TO tote)", style: "running number per brand + category", material: "material code (e.g. P = PU)", colour: "2-letter colour code" };
