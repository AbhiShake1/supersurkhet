// "use client";
// import React, { useState, useRef, useEffect } from "react";
// import { motion, Variants } from "framer-motion";
// import { z } from "zod";
// import type { ReactNode } from "react";
// import {
//   Settings,
//   User,
//   Mail,
//   LogOut,
//   Shield,
//   Lock,
//   Plus,
//   X,
// } from "lucide-react";

// // ------------------ Types ------------------
// export type MenuItem = {
//   id: string;
//   label: string;
//   icon?: ReactNode;
//   gradient?: string;
//   iconColor?: string;
//   children?: MenuItem[];
// };

// export interface HoverGradientDockProps {
//   schema?: {
//     id: string;
//     items: MenuItem[];
//     className?: string;
//     editable?: boolean;
//     onAddItem?: (newItem: MenuItem) => void;
//     onRemoveItem?: (itemId: string) => void;
//   };
// }

// // ------------------ Zod Schemas ------------------
// export const DockItemSchema = z.object({
//   id: z.string(),
//   label: z.string(),
//   icon: z.any().optional(),
//   gradient: z.string().optional(),
//   iconColor: z.string().optional(),
//   children: z.array(z.lazy(() => DockItemSchema)).optional(),
// });

// export const DockSchema = z.object({
//   id: z.string(),
//   items: z.array(DockItemSchema),
//   className: z.string().optional(),
//   editable: z.boolean().default(true),
//   onAddItem: z.function().args(z.any()).optional(),
//   onRemoveItem: z.function().args(z.string()).optional(),
// });

// export type DockType = z.infer<typeof DockSchema>;

// // ------------------ Default Dock ------------------
// export const defaultDockSchema: DockType = {
//   id: "root-Dock",
//   items: [
//     {
//       id: "messages",
//       label: "Messages",
//       icon: <Mail className="h-5 w-5" />,
//       gradient:
//         "radial-gradient(circle, rgba(147,51,234,0.15) 0%, rgba(126,34,206,0.06) 50%, rgba(88,28,135,0) 100%)",
//       iconColor: "group-hover:text-purple-500 dark:group-hover:text-purple-400",
//     },
//     {
//       id: "settings",
//       label: "Settings",
//       icon: <Settings className="h-5 w-5" />,
//       gradient:
//         "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.06) 50%, rgba(29,78,216,0) 100%)",
//       iconColor: "group-hover:text-blue-500 dark:group-hover:text-blue-400",
//       children: [
//         { id: "account-settings", label: "Account Settings", icon: <User className="h-4 w-4" /> },
//         { id: "privacy", label: "Privacy", icon: <Lock className="h-4 w-4" /> },
//         { id: "security", label: "Security", icon: <Shield className="h-4 w-4" /> },
//       ],
//     },
//     {
//       id: "profile",
//       label: "Profile",
//       icon: <User className="h-5 w-5" />,
//       gradient:
//         "radial-gradient(circle, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.06) 50%, rgba(185,28,28,0) 100%)",
//       iconColor: "group-hover:text-red-500 dark:group-hover:text-red-400",
//       children: [
//         { id: "my-profile", label: "My Profile", icon: <User className="h-4 w-4" /> },
//         { id: "my-account", label: "My Account", icon: <Shield className="h-4 w-4" /> },
//         { id: "logout", label: "Logout", icon: <LogOut className="h-4 w-4" /> },
//       ],
//     },
//   ],
//   editable: true,
// };

// // ------------------ Animations ------------------
// const itemVariants: Variants = {
//   initial: { rotateX: 0, opacity: 1 },
//   hover: { rotateX: -90, opacity: 0 },
// };

// const backVariants: Variants = {
//   initial: { rotateX: 90, opacity: 0 },
//   hover: { rotateX: 0, opacity: 1 },
// };

// const glowVariants: Variants = {
//   initial: { opacity: 0, scale: 0.8 },
//   hover: { opacity: 1, scale: 2, transition: { duration: 0.5 } },
// };

// const sharedTransition = { type: "spring", stiffness: 100, damping: 20, duration: 0.5 };

// // ------------------ Component ------------------
// export default function HoverGradientDock({ schema }: HoverGradientDockProps) {
//   // Safe schema fallback
//   const safeSchema: DockType = schema || defaultDockSchema;
//   const { items: initialItems, editable = true, onAddItem, onRemoveItem, className } = safeSchema;

//   const [dockItems, setDockItems] = useState(initialItems);
//   const [openDropdown, setOpenDropdown] = useState<string | null>(null);
//   const [isAddingItem, setIsAddingItem] = useState(false);
//   const [newItemLabel, setNewItemLabel] = useState("");
//   const [selectedGradient, setSelectedGradient] = useState("");
//   const ref = useRef<HTMLDivElement | null>(null);

//   useEffect(() => {
//     setDockItems(initialItems);
//   }, [initialItems]);

//   useEffect(() => {
//     function handleClick(e: MouseEvent) {
//       if (ref.current && !ref.current.contains(e.target as Node)) {
//         setOpenDropdown(null);
//       }
//     }
//     document.addEventListener("mousedown", handleClick);
//     return () => document.removeEventListener("mousedown", handleClick);
//   }, []);

//   const gradientPresets = [
//     "radial-gradient(circle, rgba(147,51,234,0.15) 0%, rgba(126,34,206,0.06) 50%, rgba(88,28,135,0) 100%)",
//     "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.06) 50%, rgba(29,78,216,0) 100%)",
//     "radial-gradient(circle, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.06) 50%, rgba(185,28,28,0) 100%)",
//     "radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.06) 50%, rgba(21,128,61,0) 100%)",
//     "radial-gradient(circle, rgba(245,158,11,0.15) 0%, rgba(217,119,6,0.06) 50%, rgba(180,83,9,0) 100%)",
//   ];

//   const handleAddItem = () => {
//     if (!newItemLabel.trim()) return;

//     const newItem: MenuItem = {
//       id: `custom-${Date.now()}`,
//       label: newItemLabel,
//       icon: <Mail className="h-5 w-5" />,
//       gradient: selectedGradient || gradientPresets[0],
//       iconColor: "group-hover:text-gray-500 dark:group-hover:text-gray-400",
//       children: [],
//     };

//     setDockItems([...dockItems, newItem]);
//     onAddItem?.(newItem);

//     setNewItemLabel("");
//     setSelectedGradient("");
//     setIsAddingItem(false);
//   };

//   const handleRemoveItem = (itemId: string) => {
//     if (dockItems.length <= 1) {
//       alert("Dock must have at least one item");
//       return;
//     }
//     const updated = dockItems.filter((i) => i.id !== itemId);
//     setDockItems(updated);
//     onRemoveItem?.(itemId);
//   };

//   const renderMenuItem = (item: MenuItem) => {
//     const hasDropdown = item.children && item.children.length > 0;

//     return (
//       <motion.li key={item.id} className="relative flex-1 md:flex-none group/item">
//         <motion.div
//           onClick={() =>
//             hasDropdown ? setOpenDropdown((d) => (d === item.id ? null : item.id)) : null
//           }
//           className="block cursor-pointer rounded-xl md:rounded-2xl relative"
//           style={{ perspective: "600px" }}
//           whileHover="hover"
//           initial="initial"
//         >
//           {item.gradient && (
//             <motion.div
//               className="absolute inset-0 pointer-events-none rounded-xl md:rounded-2xl"
//               variants={glowVariants}
//               style={{ background: item.gradient }}
//             />
//           )}

//           <motion.div
//             className="flex flex-col md:flex-row items-center justify-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 group-hover:text-white"
//             variants={itemVariants}
//             transition={sharedTransition}
//             style={{ transformStyle: "preserve-3d" }}
//           >
//             <span className={`${item.iconColor}`}>{item.icon}</span>
//             <span className="hidden md:inline">{item.label}</span>
//           </motion.div>

//           <motion.div
//             className="absolute inset-0 flex flex-col md:flex-row items-center justify-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300"
//             variants={backVariants}
//             transition={sharedTransition}
//           >
//             <span className={`${item.iconColor}`}>{item.icon}</span>
//             <span className="hidden md:inline">{item.label}</span>
//           </motion.div>

//           {editable && (
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 handleRemoveItem(item.id);
//               }}
//               className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/item:opacity-100 transition-opacity z-20"
//             >
//               <X className="h-3 w-3" />
//             </button>
//           )}
//         </motion.div>

//         {hasDropdown && openDropdown === item.id && (
//           <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-2 w-44 z-30">
//             {item.children!.map((child) => (
//               <button
//                 key={child.id}
//                 className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-sm text-left"
//               >
//                 {child.icon}
//                 {child.label}
//               </button>
//             ))}
//           </div>
//         )}
//       </motion.li>
//     );
//   };

//   return (
//     <div
//       ref={ref}
//       className={`fixed bottom-0 left-0 w-full md:bottom-4 md:left-1/2 md:-translate-x-1/2 z-50 ${className || ""}`}
//     >
//       <motion.nav
//         className="w-full md:w-fit mx-auto px-2 md:px-4 py-2 md:py-3 bg-white/90 dark:bg-black/80 backdrop-blur-xl border-t md:border border-gray-200/80 dark:border-gray-800/80 rounded-none md:rounded-3xl shadow-lg relative"
//         initial="initial"
//         whileHover="hover"
//       >
//         <ul className="flex items-center justify-around md:justify-center gap-1 md:gap-3 relative z-10">
//           {dockItems.map(renderMenuItem)}

//           {editable && (
//             <motion.li className="relative flex-1 md:flex-none">
//               {isAddingItem && (
//                 <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 z-30">
//                   <div className="space-y-3">
//                     <input
//                       type="text"
//                       value={newItemLabel}
//                       onChange={(e) => setNewItemLabel(e.target.value)}
//                       placeholder="Item label"
//                       className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
//                       autoFocus
//                       onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
//                     />
//                     <div className="space-y-2">
//                       <label className="text-sm text-gray-600 dark:text-gray-300">Select gradient:</label>
//                       <div className="flex flex-wrap gap-2">
//                         {gradientPresets.map((gradient, index) => (
//                           <button
//                             key={index}
//                             onClick={() => setSelectedGradient(gradient)}
//                             className={`w-8 h-8 rounded-full border-2 ${
//                               selectedGradient === gradient
//                                 ? "border-blue-500"
//                                 : "border-gray-300 dark:border-gray-600"
//                             }`}
//                             style={{ background: gradient }}
//                             title={`Gradient ${index + 1}`}
//                           />
//                         ))}
//                       </div>
//                     </div>
//                     <div className="flex gap-2">
//                       <button
//                         onClick={handleAddItem}
//                         className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
//                       >
//                         Add
//                       </button>
//                       <button
//                         onClick={() => setIsAddingItem(false)}
//                         className="flex-1 bg-gray-200 dark:bg-gray-700 py-2 rounded-lg"
//                       >
//                         Cancel
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               )}
//               <button
//                 onClick={() => setIsAddingItem(true)}
//                 className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
//                 title="Add new item"
//               >
//                 <Plus className="h-5 w-5 text-gray-600 dark:text-gray-300" />
//               </button>
//             </motion.li>
//           )}
//         </ul>
//       </motion.nav>
//     </div>
//   );
// }
