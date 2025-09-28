import { z } from "zod";
import { table, withLabel } from "./listings";

export const folderSchema = z
  .object({
    name: withLabel(z.string().optional(), "Folder Name"),
    apps: withLabel(
      z.array(z.string()).default([]),
      "Apps in Folder"
    ),
    userId: withLabel(z.string(), "User ID"),
  })
  .extend(table);

export type Folder = z.infer<typeof folderSchema>;