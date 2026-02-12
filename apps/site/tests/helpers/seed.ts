import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(__dirname, "..", ".data");
const businessDataPath = path.join(dataDir, "business.json");

export type BusinessSeed = {
  slug: string;
  name: string;
};

export function writeBusinessSeed(seed: BusinessSeed) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(businessDataPath, JSON.stringify(seed, null, 2));
}

export function readBusinessSeed(): BusinessSeed {
  if (!fs.existsSync(businessDataPath)) {
    throw new Error(
      "Business seed not found. Run the setup tests to create a business.",
    );
  }
  return JSON.parse(fs.readFileSync(businessDataPath, "utf8")) as BusinessSeed;
}

export function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

export const businessSeedFile = businessDataPath;
