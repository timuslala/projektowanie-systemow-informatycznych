from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from question.models import MultipleChoiceOption, Question

# Create your tests here.
from user.models import User

from .models import QuestionBank


class QuestionBankViewSetTests(APITestCase):
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

    def setUp(self):
        # API clients
        # Course with instructor

        self.questionbank = QuestionBank.objects.create(
            title="Test Questionbank", user=self.instructor_user
        )
        self.question1 = Question.objects.create(
            text="question text1", question_bank=self.questionbank, is_open_ended=False
        )
        self.question2 = Question.objects.create(
            text="question text2", question_bank=self.questionbank, is_open_ended=False
        )
        self.multiple_choice_question = MultipleChoiceOption.objects.create(
            text="multiple choice question",
            question_bank=self.questionbank,
            is_open_ended=True,
            option1="1",
            option2="2",
            option3="3",
            option4="4",
            correct_option=1,
        )
        self.url = f"/api/question_banks/{self.questionbank.id}/"

        self.admin_client = APIClient()
        self.admin_client.force_authenticate(user=self.admin_user)

        self.instructor_client = APIClient()
        self.instructor_client.force_authenticate(user=self.instructor_user)

        self.student_client = APIClient()
        self.student_client.force_authenticate(user=self.student_user)

    # --- GET tests ---
    def test_get_question_bank_as_admin(self):
        response = self.admin_client.get(self.url)
        self.assertEqual(
            response.data,
            {
                "id": self.questionbank.id,
                "title": "Test Questionbank",
                "number_of_questions": 3,
                "question_set": [
                    self.question1.id,
                    self.question2.id,
                    self.multiple_choice_question.id,
                ],
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_question_bank_as_instructor(self):
        response = self.admin_client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_question_bank_as_user(self):
        response = self.student_client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
