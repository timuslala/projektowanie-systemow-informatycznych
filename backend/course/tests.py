from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from user.models import User

from .models import Course, CourseProgress


class CourseViewSetTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        # Create users
        cls.admin_user = User.objects.create_superuser(
            username="admin", email="admin@test.com", password="adminpass"
        )
        cls.instructor_user = User.objects.create_user(
            username="instructor",
            email="instructor@test.com",
            password="instrpass",
            is_teacher=True,
        )
        cls.student_user = User.objects.create_user(
            username="student", email="student@test.com", password="studentpass"
        )
        cls.other_student = User.objects.create_user(
            username="otherstudent", email="other@test.com", password="otherpass"
        )

    def setUp(self):
        # API clients
        # Course with instructor
        self.course = Course.objects.create(
            title="Test Course",
            description="Test Description",
            instructor=self.instructor_user,
        )

        # Enroll student in course
        CourseProgress.objects.create(
            user=self.student_user,
            course=self.course,
            completed=False,
            percent_complete=0.0,
        )
        self.url = f"/api/courses/{self.course.id}"

        self.admin_client = APIClient()
        self.admin_client.force_authenticate(user=self.admin_user)

        self.instructor_client = APIClient()
        self.instructor_client.force_authenticate(user=self.instructor_user)

        self.student_client = APIClient()
        self.student_client.force_authenticate(user=self.student_user)

        self.other_student_client = APIClient()
        self.other_student_client.force_authenticate(user=self.other_student)

    # --- GET tests ---
    def test_get_course_as_admin(self):
        response = self.admin_client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_course_as_instructor(self):
        response = self.instructor_client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_course_as_enrolled_student(self):
        response = self.student_client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_course_as_non_enrolled_student_non_found(self):
        response = self.other_student_client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- PUT/PATCH tests (only admin and instructor can update) ---
    def test_put_course_as_admin(self):
        data = {
            "title": "Updated Title",
            "description": "Updated Desc",
            "instructor": self.instructor_user.id,
        }
        response = self.admin_client.put(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_put_course_as_instructor(self):
        data = {
            "title": "Instructor Update",
            "description": "Updated Desc",
            "instructor": self.instructor_user.id,
        }
        response = self.instructor_client.put(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_put_course_as_student_forbidden(self):
        data = {
            "title": "Student Update",
            "description": "Updated Desc",
            "instructor": self.instructor_user.id,
        }
        response = self.student_client.put(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_put_course_as_non_enrolled_student_not_found(self):
        data = {
            "title": "Other Student Update",
            "description": "Updated Desc",
            "instructor": self.instructor_user.id,
        }
        response = self.other_student_client.put(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- PATCH tests ---
    def test_patch_course_as_admin(self):
        response = self.admin_client.patch(self.url, {"title": "Patched Title"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_patch_course_as_instructor(self):
        response = self.instructor_client.patch(
            self.url, {"title": "Instructor Patched"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_patch_course_as_student_forbidden(self):
        response = self.student_client.patch(self.url, {"title": "Student Patched"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch_course_as_non_enrolled_student_not_found(self):
        response = self.other_student_client.patch(
            self.url, {"title": "Non Enrolled Student Patched"}
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- DELETE tests ---
    def test_delete_course_as_admin(self):
        response = self.admin_client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_course_as_instructor(self):
        response = self.instructor_client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_course_as_student_forbidden(self):
        response = self.student_client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_course_as_non_enrolled_student_not_found(self):
        response = self.other_student_client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # user info checks tests
    def test_check_admin_user_info_from_unrelated_student_forbidden(self):
        response = self.other_student_client.get(
            f"/accounts/check_user_info/{self.admin_user.id}/"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_check_instructor_info_from_unrelated_student_forbidden(self):
        response = self.other_student_client.get(
            f"/accounts/check_user_info/{self.instructor_user.id}/"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_check_instructor_info_from_related_student_ok(self):
        response = self.student_client.get(
            f"/accounts/check_user_info/{self.instructor_user.id}/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_check_student_info_from_instructor_ok(self):
        response = self.instructor_client.get(
            f"/accounts/check_user_info/{self.student_user.id}/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_check_student_info_from_admin_ok(self):
        response = self.admin_client.get(
            f"/accounts/check_user_info/{self.student_user.id}/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_check_non_existant_info_from_instructor_forbidden(self):
        response = self.instructor_client.get(f"/accounts/check_user_info/999/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_not_found_same_response_as_insufficient_permissions(self):
        response = self.instructor_client.get(f"/accounts/check_user_info/999/")
        response2 = self.other_student_client.get(
            f"/accounts/check_user_info/{self.instructor_user.id}/"
        )
        self.assertEqual(response.data, response2.data)
        self.assertEqual(response.status_code, response2.status_code)
        self.assertEqual(response.headers, response2.headers)
