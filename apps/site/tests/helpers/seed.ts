import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "..", ".data");
const businessDataPath = path.join(dataDir, "business.json");

type BusinessSeed = {
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
