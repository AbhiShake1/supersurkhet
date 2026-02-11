'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  BookOpen,
  User,
  GraduationCap,
  Users,
  CreditCard,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AdminComponent } from '@/components/ui/admin';

interface Course {
  id: string;
  name: string;
  description: string;
  duration: string;
  fees: number;
  instructorId: string;
  active: boolean;
}

interface Instructor {
  id: string;
  name: string;
  qualification: string;
  experience: string;
  specialization: string;
  rating: number;
  active: boolean;
}

interface Student {
  id: string;
  name: string;
  courseId: string;
  courseName: string;
  enrollmentDate: string;
  status: 'active' | 'graduated' | 'dropped';
  active: boolean;
}

interface Enrollment {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  enrollmentDate: string;
  paymentStatus: 'pending' | 'paid' | 'overdue';
  active: boolean;
}

const mockCourses: Course[] = [
  {
    id: '1',
    name: 'Bachelor of Science (BSc)',
    description:
      'Comprehensive science program covering physics, chemistry, and mathematics',
    duration: '4 Years',
    fees: 120000,
    instructorId: '1',
    active: true,
  },
  {
    id: '2',
    name: 'Bachelor of Arts (BA)',
    description:
      'Liberal arts program focusing on humanities, social sciences, and literature',
    duration: '4 Years',
    fees: 100000,
    instructorId: '2',
    active: true,
  },
  {
    id: '3',
    name: 'Master of Business Administration (MBA)',
    description:
      'Advanced business management program with focus on entrepreneurship and leadership',
    duration: '2 Years',
    fees: 200000,
    instructorId: '3',
    active: false,
  },
  {
    id: '4',
    name: 'Computer Science Engineering',
    description:
      'Modern computer science program covering programming, algorithms, and software development',
    duration: '4 Years',
    fees: 150000,
    instructorId: '4',
    active: true,
  },
];

const mockInstructors: Instructor[] = [
  {
    id: '1',
    name: 'Dr. Rajesh K.C.',
    qualification: 'Ph.D. in Physics',
    experience: '15+ years',
    specialization: 'Quantum Mechanics',
    rating: 4.9,
    active: true,
  },
  {
    id: '2',
    name: 'Prof. Sunita Thapa',
    qualification: 'M.A. in Literature',
    experience: '12+ years',
    specialization: 'English Literature',
    rating: 4.8,
    active: true,
  },
  {
    id: '3',
    name: 'Dr. Amit Shah',
    qualification: 'MBA, Ph.D. in Management',
    experience: '18+ years',
    specialization: 'Entrepreneurship',
    rating: 5.0,
    active: false,
  },
  {
    id: '4',
    name: 'Er. Priya Gurung',
    qualification: 'B.E. Computer Engineering',
    experience: '10+ years',
    specialization: 'Software Development',
    rating: 4.7,
    active: true,
  },
];

const mockStudents: Student[] = [
  {
    id: '1',
    name: 'Ram Bahadur',
    courseId: '1',
    courseName: 'Bachelor of Science (BSc)',
    enrollmentDate: '2025-08-01',
    status: 'active',
    active: true,
  },
  {
    id: '2',
    name: 'Sita Kumari',
    courseId: '2',
    courseName: 'Bachelor of Arts (BA)',
    enrollmentDate: '2025-08-01',
    status: 'active',
    active: true,
  },
  {
    id: '3',
    name: 'Hari Prasad',
    courseId: '4',
    courseName: 'Computer Science Engineering',
    enrollmentDate: '2025-08-01',
    status: 'graduated',
    active: false,
  },
  {
    id: '4',
    name: 'Gita Devi',
    courseId: '1',
    courseName: 'Bachelor of Science (BSc)',
    enrollmentDate: '2025-08-01',
    status: 'active',
    active: true,
  },
];

const mockEnrollments: Enrollment[] = [
  {
    id: '1',
    studentId: '1',
    studentName: 'Ram Bahadur',
    courseId: '1',
    courseName: 'Bachelor of Science (BSc)',
    enrollmentDate: '2025-08-01',
    paymentStatus: 'paid',
    active: true,
  },
  {
    id: '2',
    studentId: '2',
    studentName: 'Sita Kumari',
    courseId: '2',
    courseName: 'Bachelor of Arts (BA)',
    enrollmentDate: '2025-08-01',
    paymentStatus: 'pending',
    active: true,
  },
  {
    id: '3',
    studentId: '3',
    studentName: 'Hari Prasad',
    courseId: '4',
    courseName: 'Computer Science Engineering',
    enrollmentDate: '2025-07-15',
    paymentStatus: 'paid',
    active: false,
  },
  {
    id: '4',
    studentId: '4',
    studentName: 'Gita Devi',
    courseId: '1',
    courseName: 'Bachelor of Science (BSc)',
    enrollmentDate: '2025-08-01',
    paymentStatus: 'overdue',
    active: true,
  },
];

export const EducationManagement: AdminComponent = () => {
  return (
    <_EducationManagement
      courses={mockCourses}
      instructors={mockInstructors}
      students={mockStudents}
      enrollments={mockEnrollments}
      onAddCourse={() => {}}
      onAddInstructor={() => {}}
      onAddStudent={() => {}}
      onAddEnrollment={() => {}}
    />
  );
};

interface EducationManagementProps {
  onAddCourse: () => void;
  onAddInstructor: () => void;
  onAddStudent: () => void;
  onAddEnrollment: () => void;
  courses: Course[];
  instructors: Instructor[];
  students: Student[];
  enrollments: Enrollment[];
}

function _EducationManagement({
  onAddCourse,
  onAddInstructor,
  onAddStudent,
  onAddEnrollment,
  courses,
  instructors,
  students,
  enrollments,
}: EducationManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('courses');

  const filteredCourses = courses.filter((course) => {
    return (
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredInstructors = instructors.filter((instructor) => {
    return (
      instructor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instructor.qualification
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      instructor.specialization
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      instructor.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredStudents = students.filter((student) => {
    return (
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredEnrollments = enrollments.filter((enrollment) => {
    return (
      enrollment.studentName
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      enrollment.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enrollment.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const toggleCourseActive = (_id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Course ${active ? 'activated' : 'deactivated'}`);
  };

  const toggleInstructorActive = (_id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Instructor ${active ? 'activated' : 'deactivated'}`);
  };

  const toggleStudentActive = (_id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Student ${active ? 'activated' : 'deactivated'}`);
  };

  const toggleEnrollmentActive = (_id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Enrollment ${active ? 'activated' : 'deactivated'}`);
  };

  const deleteCourse = (_id: string) => {
    // In a real implementation, this would delete the course from GunDB
    toast.success('Course removed');
  };

  const deleteInstructor = (_id: string) => {
    // In a real implementation, this would delete the instructor from GunDB
    toast.success('Instructor removed');
  };

  const deleteStudent = (_id: string) => {
    // In a real implementation, this would delete the student from GunDB
    toast.success('Student removed');
  };

  const deleteEnrollment = (_id: string) => {
    // In a real implementation, this would delete the enrollment from GunDB
    toast.success('Enrollment removed');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Education Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your courses, instructors, students, and enrollments
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onAddCourse} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Course
          </Button>
          <Button onClick={onAddInstructor} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Instructor
          </Button>
          <Button onClick={onAddStudent} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
          <Button onClick={onAddEnrollment} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Enrollment
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
                  Active Courses
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {courses.filter((c) => c.active).length}
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Active Instructors
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {instructors.filter((i) => i.active).length}
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
                  Active Students
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {students.filter((s) => s.active).length}
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
                  Pending Payments
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {
                    enrollments.filter((e) => e.paymentStatus === 'pending')
                      .length
                  }
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search courses, instructors, students, or enrollments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs for Courses, Instructors, Students, and Enrollments */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger
            value="courses"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <BookOpen className="w-4 h-4" />
            <span className="truncate">Courses</span>
          </TabsTrigger>
          <TabsTrigger
            value="instructors"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <User className="w-4 h-4" />
            <span className="truncate">Instructors</span>
          </TabsTrigger>
          <TabsTrigger
            value="students"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <Users className="w-4 h-4" />
            <span className="truncate">Students</span>
          </TabsTrigger>
          <TabsTrigger
            value="enrollments"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <GraduationCap className="w-4 h-4" />
            <span className="truncate">Enrollments</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCourses.map((course) => (
              <Card
                key={course.id}
                className={`${!course.active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          {course.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {course.description}
                        </CardDescription>
                        <div className="flex justify-between mt-2">
                          <span className="text-lg font-bold text-primary">
                            Rs. {course.fees.toLocaleString()}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {course.duration}
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
                        checked={course.active}
                        onCheckedChange={() =>
                          toggleCourseActive(course.id, !course.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {course.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCourse(course.id)}
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

          {filteredCourses.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No courses found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new course
              </p>
              <Button onClick={onAddCourse}>
                <Plus className="w-4 h-4 mr-2" />
                Add Course
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="instructors" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredInstructors.map((instructor) => (
              <Card
                key={instructor.id}
                className={`${!instructor.active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="bg-muted rounded-full w-10 h-10 flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base">
                          {instructor.name}
                        </CardTitle>
                        <CardDescription>
                          {instructor.qualification}
                        </CardDescription>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
                              key={i}
                              className={`w-3 h-3 ${
                                i < Math.floor(instructor.rating)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="text-xs ml-1">
                            {instructor.rating}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {instructor.experience} experience
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Specialization: {instructor.specialization}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={instructor.active}
                        onCheckedChange={() =>
                          toggleInstructorActive(
                            instructor.id,
                            !instructor.active,
                          )
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {instructor.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteInstructor(instructor.id)}
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

          {filteredInstructors.length === 0 && (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No instructors found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new instructor
              </p>
              <Button onClick={onAddInstructor}>
                <Plus className="w-4 h-4 mr-2" />
                Add Instructor
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="students" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredStudents.map((student) => (
              <Card
                key={student.id}
                className={`${!student.active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="bg-muted rounded-full w-10 h-10 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base">
                          {student.name}
                        </CardTitle>
                        <CardDescription>{student.courseName}</CardDescription>
                        <p className="text-sm text-muted-foreground mt-1">
                          Enrolled: {student.enrollmentDate}
                        </p>
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
                            student.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : student.status === 'graduated'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {student.status.charAt(0).toUpperCase() +
                            student.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={student.active}
                        onCheckedChange={() =>
                          toggleStudentActive(student.id, !student.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {student.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteStudent(student.id)}
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

          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No students found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new student
              </p>
              <Button onClick={onAddStudent}>
                <Plus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="enrollments" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredEnrollments.map((enrollment) => (
              <Card
                key={enrollment.id}
                className={`${!enrollment.active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" />
                          {enrollment.studentName}
                        </CardTitle>
                        <CardDescription>
                          {enrollment.courseName}
                        </CardDescription>
                        <p className="text-sm text-muted-foreground mt-1">
                          Enrolled: {enrollment.enrollmentDate}
                        </p>
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
                            enrollment.paymentStatus === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : enrollment.paymentStatus === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {enrollment.paymentStatus.charAt(0).toUpperCase() +
                            enrollment.paymentStatus.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={enrollment.active}
                        onCheckedChange={() =>
                          toggleEnrollmentActive(
                            enrollment.id,
                            !enrollment.active,
                          )
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {enrollment.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEnrollment(enrollment.id)}
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

          {filteredEnrollments.length === 0 && (
            <div className="text-center py-12">
              <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No enrollments found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new enrollment
              </p>
              <Button onClick={onAddEnrollment}>
                <Plus className="w-4 h-4 mr-2" />
                Add Enrollment
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
