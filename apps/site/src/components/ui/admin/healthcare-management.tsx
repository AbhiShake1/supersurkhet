"use client";

import { useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Plus,
	Search,
	Edit,
	Trash2,
	Eye,
	Stethoscope,
	User,
	Calendar,
	Heart,
	Users,
	FileText,
	Building,
} from "lucide-react";
import { toast } from "sonner";
import type { AdminComponent } from "@/components/ui/admin";

interface Service {
	id: string;
	name: string;
	description: string;
	department: string;
	duration: string;
	active: boolean;
}

interface Doctor {
	id: string;
	name: string;
	specialization: string;
	experience: string;
	rating: number;
	active: boolean;
}

interface Patient {
	id: string;
	name: string;
	age: number;
	gender: string;
	phone: string;
	email: string;
	lastVisit: string;
	active: boolean;
}

interface Appointment {
	id: string;
	patientId: string;
	patientName: string;
	doctorId: string;
	doctorName: string;
	serviceId: string;
	serviceName: string;
	dateTime: string;
	status: "pending" | "confirmed" | "completed" | "cancelled";
	active: boolean;
}

const mockServices: Service[] = [
	{
		id: "1",
		name: "General Consultation",
		description:
			"Comprehensive health assessment and diagnosis by experienced physicians",
		department: "General Medicine",
		duration: "30 mins",
		active: true,
	},
	{
		id: "2",
		name: "Dental Care",
		description:
			"Complete dental care including cleaning, filling, and cosmetic dentistry",
		department: "Dentistry",
		duration: "45 mins",
		active: true,
	},
	{
		id: "3",
		name: "Diagnostic Imaging",
		description: "Advanced imaging services including X-ray, CT Scan, and MRI",
		department: "Radiology",
		duration: "Varies",
		active: false,
	},
	{
		id: "4",
		name: "Laboratory Services",
		description: "Comprehensive pathology testing with quick turnaround time",
		department: "Pathology",
		duration: "Same day",
		active: true,
	},
];

const mockDoctors: Doctor[] = [
	{
		id: "1",
		name: "Dr. Rajesh K.C.",
		specialization: "General Physician",
		experience: "15+ years",
		rating: 4.9,
		active: true,
	},
	{
		id: "2",
		name: "Dr. Sunita Thapa",
		specialization: "Dentist",
		experience: "12+ years",
		rating: 4.8,
		active: true,
	},
	{
		id: "3",
		name: "Dr. Amit Shah",
		specialization: "Pediatrician",
		experience: "10+ years",
		rating: 5.0,
		active: false,
	},
	{
		id: "4",
		name: "Dr. Priya Gurung",
		specialization: "Gynecologist",
		experience: "8+ years",
		rating: 4.7,
		active: true,
	},
];

const mockPatients: Patient[] = [
	{
		id: "1",
		name: "Ram Bahadur",
		age: 45,
		gender: "Male",
		phone: "+977-98XXXXXXXX",
		email: "ram@example.com",
		lastVisit: "2025-08-15",
		active: true,
	},
	{
		id: "2",
		name: "Sita Kumari",
		age: 32,
		gender: "Female",
		phone: "+977-98XXXXXXXX",
		email: "sita@example.com",
		lastVisit: "2025-08-10",
		active: true,
	},
	{
		id: "3",
		name: "Hari Prasad",
		age: 67,
		gender: "Male",
		phone: "+977-98XXXXXXXX",
		email: "hari@example.com",
		lastVisit: "2025-07-22",
		active: false,
	},
	{
		id: "4",
		name: "Gita Devi",
		age: 28,
		gender: "Female",
		phone: "+977-98XXXXXXXX",
		email: "gita@example.com",
		lastVisit: "2025-08-18",
		active: true,
	},
];

const mockAppointments: Appointment[] = [
	{
		id: "1",
		patientId: "1",
		patientName: "Ram Bahadur",
		doctorId: "1",
		doctorName: "Dr. Rajesh K.C.",
		serviceId: "1",
		serviceName: "General Consultation",
		dateTime: "2025-08-25T10:00:00",
		status: "confirmed",
		active: true,
	},
	{
		id: "2",
		patientId: "2",
		patientName: "Sita Kumari",
		doctorId: "2",
		doctorName: "Dr. Sunita Thapa",
		serviceId: "2",
		serviceName: "Dental Care",
		dateTime: "2025-08-25T14:00:00",
		status: "pending",
		active: true,
	},
	{
		id: "3",
		patientId: "4",
		patientName: "Gita Devi",
		doctorId: "4",
		doctorName: "Dr. Priya Gurung",
		serviceId: "1",
		serviceName: "General Consultation",
		dateTime: "2025-08-26T11:00:00",
		status: "completed",
		active: true,
	},
	{
		id: "4",
		patientId: "3",
		patientName: "Hari Prasad",
		doctorId: "1",
		doctorName: "Dr. Rajesh K.C.",
		serviceId: "1",
		serviceName: "General Consultation",
		dateTime: "2025-08-26T16:00:00",
		status: "cancelled",
		active: false,
	},
];

export const HealthcareManagement: AdminComponent = () => {
	return (
		<_HealthcareManagement
			services={mockServices}
			doctors={mockDoctors}
			patients={mockPatients}
			appointments={mockAppointments}
			onAddService={() => {}}
			onAddDoctor={() => {}}
			onAddPatient={() => {}}
			onAddAppointment={() => {}}
		/>
	);
};

interface HealthcareManagementProps {
	onAddService: () => void;
	onAddDoctor: () => void;
	onAddPatient: () => void;
	onAddAppointment: () => void;
	services: Service[];
	doctors: Doctor[];
	patients: Patient[];
	appointments: Appointment[];
}

function _HealthcareManagement({
	onAddService,
	onAddDoctor,
	onAddPatient,
	onAddAppointment,
	services,
	doctors,
	patients,
	appointments,
}: HealthcareManagementProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTab, setSelectedTab] = useState("services");

	const filteredServices = services.filter((service) => {
		return (
			service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
			service.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
			service.id.toLowerCase().includes(searchQuery.toLowerCase())
		);
	});

	const filteredDoctors = doctors.filter((doctor) => {
		return (
			doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			doctor.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
			doctor.experience.toLowerCase().includes(searchQuery.toLowerCase()) ||
			doctor.id.toLowerCase().includes(searchQuery.toLowerCase())
		);
	});

	const filteredPatients = patients.filter((patient) => {
		return (
			patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			patient.gender.toLowerCase().includes(searchQuery.toLowerCase()) ||
			patient.phone.includes(searchQuery) ||
			patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
			patient.id.toLowerCase().includes(searchQuery.toLowerCase())
		);
	});

	const filteredAppointments = appointments.filter((appointment) => {
		return (
			appointment.patientName
				.toLowerCase()
				.includes(searchQuery.toLowerCase()) ||
			appointment.doctorName
				.toLowerCase()
				.includes(searchQuery.toLowerCase()) ||
			appointment.serviceName
				.toLowerCase()
				.includes(searchQuery.toLowerCase()) ||
			appointment.id.toLowerCase().includes(searchQuery.toLowerCase())
		);
	});

	const toggleServiceActive = (id: string, active: boolean) => {
		// In a real implementation, this would update the data in GunDB
		toast.success(`Service ${active ? "activated" : "deactivated"}`);
	};

	const toggleDoctorActive = (id: string, active: boolean) => {
		// In a real implementation, this would update the data in GunDB
		toast.success(`Doctor ${active ? "activated" : "deactivated"}`);
	};

	const togglePatientActive = (id: string, active: boolean) => {
		// In a real implementation, this would update the data in GunDB
		toast.success(`Patient ${active ? "activated" : "deactivated"}`);
	};

	const toggleAppointmentActive = (id: string, active: boolean) => {
		// In a real implementation, this would update the data in GunDB
		toast.success(`Appointment ${active ? "activated" : "deactivated"}`);
	};

	const deleteService = (id: string) => {
		// In a real implementation, this would delete the service from GunDB
		toast.success("Service removed");
	};

	const deleteDoctor = (id: string) => {
		// In a real implementation, this would delete the doctor from GunDB
		toast.success("Doctor removed");
	};

	const deletePatient = (id: string) => {
		// In a real implementation, this would delete the patient from GunDB
		toast.success("Patient removed");
	};

	const deleteAppointment = (id: string) => {
		// In a real implementation, this would delete the appointment from GunDB
		toast.success("Appointment removed");
	};

	const updateAppointmentStatus = (
		id: string,
		status: Appointment["status"],
	) => {
		// In a real implementation, this would update the appointment status in GunDB
		toast.success(`Appointment ${status}`);
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
						Healthcare Management
					</h2>
					<p className="text-gray-600 dark:text-gray-400">
						Manage your medical services, doctors, patients, and appointments
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button onClick={onAddService} className="w-full sm:w-auto">
						<Plus className="w-4 h-4 mr-2" />
						Add Service
					</Button>
					<Button onClick={onAddDoctor} className="w-full sm:w-auto">
						<Plus className="w-4 h-4 mr-2" />
						Add Doctor
					</Button>
					<Button onClick={onAddPatient} className="w-full sm:w-auto">
						<Plus className="w-4 h-4 mr-2" />
						Add Patient
					</Button>
					<Button onClick={onAddAppointment} className="w-full sm:w-auto">
						<Plus className="w-4 h-4 mr-2" />
						Add Appointment
					</Button>
				</div>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Active Services
								</p>
								<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
									{services.filter((s) => s.active).length}
								</p>
							</div>
							<Stethoscope className="w-8 h-8 text-gray-400" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Active Doctors
								</p>
								<p className="text-2xl font-bold text-green-600">
									{doctors.filter((d) => d.active).length}
								</p>
							</div>
							<User className="w-8 h-8 text-green-500" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Active Patients
								</p>
								<p className="text-2xl font-bold text-blue-600">
									{patients.filter((p) => p.active).length}
								</p>
							</div>
							<Users className="w-8 h-8 text-blue-500" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Pending Appointments
								</p>
								<p className="text-2xl font-bold text-purple-600">
									{appointments.filter((a) => a.status === "pending").length}
								</p>
							</div>
							<Calendar className="w-8 h-8 text-purple-500" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Search and Filters */}
			<div className="flex flex-col sm:flex-row gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
					<Input
						placeholder="Search services, doctors, patients, or appointments..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-10"
					/>
				</div>
			</div>

			{/* Tabs for Services, Doctors, Patients, and Appointments */}
			<Tabs value={selectedTab} onValueChange={setSelectedTab}>
				<TabsList className="grid w-full grid-cols-4 h-auto">
					<TabsTrigger
						value="services"
						className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
					>
						<Stethoscope className="w-4 h-4" />
						<span className="truncate">Services</span>
					</TabsTrigger>
					<TabsTrigger
						value="doctors"
						className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
					>
						<User className="w-4 h-4" />
						<span className="truncate">Doctors</span>
					</TabsTrigger>
					<TabsTrigger
						value="patients"
						className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
					>
						<Users className="w-4 h-4" />
						<span className="truncate">Patients</span>
					</TabsTrigger>
					<TabsTrigger
						value="appointments"
						className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
					>
						<Calendar className="w-4 h-4" />
						<span className="truncate">Appointments</span>
					</TabsTrigger>
				</TabsList>

				<TabsContent value="services" className="space-y-4 mt-6">
					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
						{filteredServices.map((service) => (
							<Card
								key={service.id}
								className={`${!service.active ? "opacity-60" : ""}`}
							>
								<CardHeader className="pb-3">
									<div className="flex items-start justify-between">
										<div className="flex items-start gap-3 min-w-0 flex-1">
											<div className="min-w-0 flex-1">
												<CardTitle className="text-base flex items-center gap-2">
													<Stethoscope className="w-4 h-4" />
													{service.name}
												</CardTitle>
												<CardDescription>{service.department}</CardDescription>
												<p className="text-sm text-muted-foreground mt-1">
													{service.description}
												</p>
												<div className="flex justify-between mt-2">
													<span className="text-sm text-muted-foreground">
														{service.duration}
													</span>
												</div>
											</div>
										</div>
									</div>
								</CardHeader>

								<CardContent className="pt-0">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<Switch
												checked={service.active}
												onCheckedChange={() =>
													toggleServiceActive(service.id, !service.active)
												}
											/>
											<span className="text-sm text-gray-600 dark:text-gray-400">
												{service.active ? "Active" : "Inactive"}
											</span>
										</div>

										<div className="flex items-center gap-1">
											<Button variant="ghost" size="sm">
												<Edit className="w-4 h-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => deleteService(service.id)}
												className="text-red-600 hover:text-red-700"
											>
												<Trash2 className="w-4 h-4" />
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>

					{filteredServices.length === 0 && (
						<div className="text-center py-12">
							<Stethoscope className="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
								No services found
							</h3>
							<p className="text-gray-500 dark:text-gray-400 mb-4">
								Try adjusting your search or add a new service
							</p>
							<Button onClick={onAddService}>
								<Plus className="w-4 h-4 mr-2" />
								Add Service
							</Button>
						</div>
					)}
				</TabsContent>

				<TabsContent value="doctors" className="space-y-4 mt-6">
					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
						{filteredDoctors.map((doctor) => (
							<Card
								key={doctor.id}
								className={`${!doctor.active ? "opacity-60" : ""}`}
							>
								<CardHeader className="pb-3">
									<div className="flex items-start justify-between">
										<div className="flex items-start gap-3 min-w-0 flex-1">
											<div className="bg-muted rounded-full w-10 h-10 flex items-center justify-center">
												<User className="w-5 h-5" />
											</div>
											<div className="min-w-0 flex-1">
												<CardTitle className="text-base">
													{doctor.name}
												</CardTitle>
												<CardDescription>
													{doctor.specialization}
												</CardDescription>
												<div className="flex items-center gap-1 mt-1">
													{[...Array(5)].map((_, i) => (
														<Star
															key={i}
															className={`w-3 h-3 ${
																i < Math.floor(doctor.rating)
																	? "fill-yellow-400 text-yellow-400"
																	: "text-gray-300"
															}`}
														/>
													))}
													<span className="text-xs ml-1">{doctor.rating}</span>
												</div>
												<p className="text-sm text-muted-foreground mt-1">
													{doctor.experience} experience
												</p>
											</div>
										</div>
									</div>
								</CardHeader>

								<CardContent className="pt-0">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<Switch
												checked={doctor.active}
												onCheckedChange={() =>
													toggleDoctorActive(doctor.id, !doctor.active)
												}
											/>
											<span className="text-sm text-gray-600 dark:text-gray-400">
												{doctor.active ? "Active" : "Inactive"}
											</span>
										</div>

										<div className="flex items-center gap-1">
											<Button variant="ghost" size="sm">
												<Edit className="w-4 h-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => deleteDoctor(doctor.id)}
												className="text-red-600 hover:text-red-700"
											>
												<Trash2 className="w-4 h-4" />
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>

					{filteredDoctors.length === 0 && (
						<div className="text-center py-12">
							<User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
								No doctors found
							</h3>
							<p className="text-gray-500 dark:text-gray-400 mb-4">
								Try adjusting your search or add a new doctor
							</p>
							<Button onClick={onAddDoctor}>
								<Plus className="w-4 h-4 mr-2" />
								Add Doctor
							</Button>
						</div>
					)}
				</TabsContent>

				<TabsContent value="patients" className="space-y-4 mt-6">
					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
						{filteredPatients.map((patient) => (
							<Card
								key={patient.id}
								className={`${!patient.active ? "opacity-60" : ""}`}
							>
								<CardHeader className="pb-3">
									<div className="flex items-start justify-between">
										<div className="flex items-start gap-3 min-w-0 flex-1">
											<div className="bg-muted rounded-full w-10 h-10 flex items-center justify-center">
												<Users className="w-5 h-5" />
											</div>
											<div className="min-w-0 flex-1">
												<CardTitle className="text-base">
													{patient.name}
												</CardTitle>
												<CardDescription>
													Age: {patient.age}, {patient.gender}
												</CardDescription>
												<p className="text-sm text-muted-foreground mt-1">
													Last visit: {patient.lastVisit}
												</p>
												<div className="flex items-center gap-2 mt-1">
													<Phone className="w-4 h-4 text-muted-foreground" />
													<span className="text-sm">{patient.phone}</span>
												</div>
												<div className="flex items-center gap-2">
													<Mail className="w-4 h-4 text-muted-foreground" />
													<span className="text-sm">{patient.email}</span>
												</div>
											</div>
										</div>
									</div>
								</CardHeader>

								<CardContent className="pt-0">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<Switch
												checked={patient.active}
												onCheckedChange={() =>
													togglePatientActive(patient.id, !patient.active)
												}
											/>
											<span className="text-sm text-gray-600 dark:text-gray-400">
												{patient.active ? "Active" : "Inactive"}
											</span>
										</div>

										<div className="flex items-center gap-1">
											<Button variant="ghost" size="sm">
												<Edit className="w-4 h-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => deletePatient(patient.id)}
												className="text-red-600 hover:text-red-700"
											>
												<Trash2 className="w-4 h-4" />
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>

					{filteredPatients.length === 0 && (
						<div className="text-center py-12">
							<Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
								No patients found
							</h3>
							<p className="text-gray-500 dark:text-gray-400 mb-4">
								Try adjusting your search or add a new patient
							</p>
							<Button onClick={onAddPatient}>
								<Plus className="w-4 h-4 mr-2" />
								Add Patient
							</Button>
						</div>
					)}
				</TabsContent>

				<TabsContent value="appointments" className="space-y-4 mt-6">
					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
						{filteredAppointments.map((appointment) => (
							<Card
								key={appointment.id}
								className={`${!appointment.active ? "opacity-60" : ""}`}
							>
								<CardHeader className="pb-3">
									<div className="flex items-start justify-between">
										<div className="flex items-start gap-3 min-w-0 flex-1">
											<div className="min-w-0 flex-1">
												<CardTitle className="text-base flex items-center gap-2">
													<Calendar className="w-4 h-4" />
													{appointment.serviceName}
												</CardTitle>
												<CardDescription className="line-clamp-1">
													{appointment.patientName}
												</CardDescription>
												<p className="text-sm text-muted-foreground mt-1">
													with {appointment.doctorName}
												</p>
												<p className="text-sm font-medium mt-1">
													{new Date(appointment.dateTime).toLocaleString()}
												</p>
											</div>
										</div>
									</div>
								</CardHeader>

								<CardContent className="pt-0">
									<div className="flex items-center justify-between">
										<span
											className={`px-2 py-1 text-xs rounded-full ${
												appointment.status === "pending"
													? "bg-yellow-100 text-yellow-800"
													: appointment.status === "confirmed"
														? "bg-blue-100 text-blue-800"
														: appointment.status === "completed"
															? "bg-green-100 text-green-800"
															: "bg-red-100 text-red-800"
											}`}
										>
											{appointment.status.charAt(0).toUpperCase() +
												appointment.status.slice(1)}
										</span>

										<div className="flex items-center gap-1">
											{appointment.status === "pending" && (
												<Button
													variant="ghost"
													size="sm"
													onClick={() =>
														updateAppointmentStatus(appointment.id, "confirmed")
													}
													className="text-green-600 hover:text-green-700"
												>
													<Check className="w-4 h-4" />
												</Button>
											)}
											{appointment.status === "confirmed" && (
												<Button
													variant="ghost"
													size="sm"
													onClick={() =>
														updateAppointmentStatus(appointment.id, "completed")
													}
													className="text-green-600 hover:text-green-700"
												>
													<Check className="w-4 h-4" />
												</Button>
											)}
											<Button
												variant="ghost"
												size="sm"
												onClick={() =>
													updateAppointmentStatus(appointment.id, "cancelled")
												}
												className="text-red-600 hover:text-red-700"
											>
												<X className="w-4 h-4" />
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>

					{filteredAppointments.length === 0 && (
						<div className="text-center py-12">
							<Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
								No appointments found
							</h3>
							<p className="text-gray-500 dark:text-gray-400 mb-4">
								Try adjusting your search or add a new appointment
							</p>
							<Button onClick={onAddAppointment}>
								<Plus className="w-4 h-4 mr-2" />
								Add Appointment
							</Button>
						</div>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
