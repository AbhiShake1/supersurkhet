# SuperSurkhet: Implementation Plan & Project Blueprint

## 1. Project Vision & Core Philosophy

**SuperSurkhet** is a full-stack monorepo project designed to build a "Super-App as a Service" platform. Its mission is to digitally empower the businesses, organizations, and residents of Surkhet, Nepal, by providing powerful, self-service digital tools.

The platform moves beyond being a single application and instead provides the building blocks for users to create their own digital solutions, from a simple online storefront to a complete ERP system.

### Core Principles:

*   **Decentralization & Data Sovereignty:** Built on **GunDB**, the platform ensures business owners retain full control and ownership of their data. The `relay` app is a stable peer, not a central data authority.
*   **Self-Service & Scalability:** The primary goal is to enable users to dynamically generate their own admin panels, client UIs, and business workflows by selecting pre-configured **Business Blueprints**. This allows for massive scalability.
*   **Mobile-First:** All user interfaces, both admin and client-facing, must be designed and optimized for a seamless experience on mobile devices.
*   **Community Empowerment:** The platform is designed to be a foundational piece of digital infrastructure for Surkhet, fostering a local tech ecosystem.

---

## 2. Core Platform Architecture

The project is a TypeScript monorepo powered by `pnpm`, `Turborepo`, and a modern React-based stack.

### Key Architectural Concepts:

#### a. The `auto*` Schema-Driven UI System

This is the technical heart of the platform. The entire system is built on the principle that a **Zod schema** can define a data model, and from that schema, a complete CRUD (Create, Read, Update, Delete) interface can be automatically generated.

*   **`AutoAdmin`**: The main component for an admin page. It takes a configuration of tabs, each rendering a specific view of the data.
*   **`AutoTable`**: Dynamically generates a feature-rich data table (with sorting, filtering, pagination, and inline editing) directly from a Zod schema.
*   **`AutoForm`**: Generates data entry and editing forms based on a Zod schema, complete with validation.
*   **`AutoKanban`**: Generates a drag-and-drop Kanban board for schemas that have a status field (e.g., `orderStatus`).
*   **Custom Builders**: For non-tabular data views (e.g., a calendar for appointments, a visual map for seating), the `AutoAdmin` can accept a custom React component (`builder`), allowing for unlimited flexibility while retaining the speed of the `auto*` system.

#### b. Unified ID

A single, universal user account system. A resident's `Unified ID` is their key to interacting with every business and service on the platform—from logging into their co-op portal to ordering food to booking a ride. This creates a seamless, integrated user experience.

#### c. Hyperlocal Discovery Portal

The main entry point for customers. This will be a map-centric, highly filterable portal that allows users to discover and interact with any business or service registered on the SuperSurkhet platform. It's the digital "town square."

---

## 3. Detailed Module Feature Sets

### Module 1: Retail & eCommerce

*   **Target Users:** Grocery stores, clothing shops, furniture marts, electronics retailers.
*   **Goal:** To provide a complete solution for managing inventory, sales, and an online presence.
*   **Admin Panel Features:**
    *   **Product Management:** Create/edit products with variants (size, color), categories, high-res images, and pricing.
    *   **Inventory Control:** Real-time stock tracking with low-stock alerts.
    *   **Order Management:** A Kanban board (`New`, `Processing`, `Ready for Pickup`, `Completed`) for online orders.
    *   **Point of Sale (POS):** A simple, fast interface for in-store sales with barcode scanner support.
    *   **Subscription Management:** Configure and manage recurring orders for daily goods (e.g., milk, bread).
    *   **Sales Dashboard:** Analytics on revenue, top-selling products, and customer trends.
    *   **Customer Management:** View customer purchase history and contact information.
*   **Client-Facing Features:**
    *   A clean, modern, public-facing storefront (`surkhet.tech/business-name`).
    *   Powerful search and filtering (by category, price, brand).
    *   Seamless shopping cart and checkout experience.
    *   User account with order history and status tracking.

### Module 2: Food & Hospitality

*   **Target Users:** Restaurants, cafes, hotels, cloud kitchens.
*   **Goal:** To streamline all operations from ordering and kitchen management to reservations.
*   **Admin Panel Features:**
    *   **Digital Menu Builder:** Create and organize menus with items, descriptions, prices, photos, and modifiers (e.g., "extra cheese").
    *   **Kitchen Order Ticket (KOT) System:** A real-time Kanban board for the kitchen staff (`New`, `Preparing`, `Ready`).
    *   **Table Management:** A custom **visual builder** to map the restaurant's floor plan.
    *   **Reservation System:** A custom **calendar view** to manage and accept bookings for tables or hotel rooms.
    *   **POS Integration:** For handling payments for dine-in and takeaway orders.
*   **Client-Facing Features:**
    *   **Scan-to-Order:** QR code on tables that opens the digital menu for ordering directly.
    *   **Online Ordering:** For home delivery or pickup.
    *   **Reservation Portal:** A simple form to book a table or room.

### Module 3: Logistics (Ride-Sharing, Delivery, Rentals)

*   **Target Users:** Taxi services, local couriers, rental businesses.
*   **Goal:** To provide a real-time platform for managing a fleet and connecting with customers.
*   **Admin Panel Features:**
    *   **Fleet Management:** Register and manage drivers/vehicles.
    *   **Dispatch Dashboard:** A live map showing all active drivers and incoming job requests. Ability to manually or automatically assign jobs.
    *   **Pricing Configuration:** Set rules for fares (base fare, per km, per minute).
    *   **Trip/Delivery History:** Detailed logs of all completed jobs for accounting and analysis.
*   **Client-Facing Features:**
    *   Simple interface to select service (ride, delivery, rental type).
    *   Map interface to set pickup and drop-off locations.
    *   Real-time tracking of the assigned driver/vehicle.
    *   Upfront fare estimates and in-app payments.
    *   Rating and review system for drivers.

### Module 4: ERP (Enterprise Resource Planning)

*   **Target Users:** Mature businesses needing an all-in-one solution.
*   **Goal:** To unify all business operations into a single, intelligent dashboard.
*   **Admin Panel Features:**
    *   **Unified Dashboard:** At-a-glance view of sales, expenses, inventory levels, and customer feedback.
    *   **Financial Accounting:** Expense tracking, profit/loss statements, and data exports for accountants.
    *   **Supplier Management:** A directory of suppliers and a system for creating and tracking purchase orders.
    *   **CRM:** Advanced customer management, including segmentation and communication tools.
    *   **Employee Management:** Role-based access control for staff.

### Module 5: Co-operatives (`Sahakari`)

*   **Target Users:** Local savings and credit co-operatives.
*   **Goal:** To digitize member management and financial operations.
*   **Admin Panel Features:**
    *   **Member Management:** A complete database of all members and their details.
    *   **Account Management:** Manage savings, shares, and loan accounts for each member.
    *   **Transaction Processing:** Log deposits, withdrawals, and loan disbursements.
    *   **Reporting:** Generate reports required for regulatory compliance.
    *   **Notice Distribution:** A secure portal to send notices to members.
*   **Client-Facing Features (Member Portal):**
    *   Secure login with Unified ID.
    *   View personal account statements.
    *   Apply for loans online.
    *   Receive official notices and updates.

### Module 6: Healthcare

*   **Target Users:** Clinics, hospitals, pharmacies.
*   **Goal:** To make healthcare more accessible and manageable for patients and providers.
*   **Admin Panel Features (Clinic/Hospital):**
    *   **Doctor Management:** Manage doctor profiles, specializations, and schedules.
    *   **Appointment Dashboard:** A **calendar view** to manage the daily appointment schedule for all doctors.
    *   **Patient Records:** A secure system for basic patient information and visit history.
*   **Client-Facing Features:**
    *   Search for doctors and clinics by specialty and location.
    *   View doctor profiles, availability, and book appointments.
    *   Receive automated appointment reminders.
    *   (Future) Integration with pharmacies for prescription fulfillment.

### Module 7: Education

*   **Target Users:** Schools, colleges, tuition centers.
*   **Goal:** To improve communication and administrative efficiency.
*   **Admin Panel Features:**
    *   **Student & Staff Management:** Central database for all student and teacher information.
    *   **Class & Timetable Management:** Tools to create and manage class schedules.
    *   **Attendance Tracking:** A simple interface for teachers to mark daily attendance.
    *   **Notice Board:** A portal to publish announcements for parents and students.
*   **Client-Facing Features (Parent/Student Portal):**
    *   View attendance records, class schedules, and (eventually) grades.
    *   Receive all official school notices and event information directly.
