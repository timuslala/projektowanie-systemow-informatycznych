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
            text="question text1", question_bank=self.questionbank, question_type="open"
        )
        self.question2 = Question.objects.create(
            text="question text2", question_bank=self.questionbank, question_type="open"
        )
        self.question3 = Question.objects.create(
            text="question text3", question_bank=self.questionbank, question_type="mcq"
        )
        self.multiple_choice_question = MultipleChoiceOption.objects.create(
            question=self.question3,
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
                    self.question3.id,
                ],
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_question_bank_as_instructor(self):
        response = self.instructor_client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_question_bank_as_user(self):
        response = self.student_client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_question_bank_questions_as_instructor(self):
        response = self.instructor_client.get(self.url + "questions/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "count": 3,
                "next": None,
                "previous": None,
                "results": [
                    {
                        "id": self.question1.id,
                        "text": self.question1.text,
                        "question_type": self.question1.question_type,
                        "mcq": None,
                    },
                    {
                        "id": self.question2.id,
                        "text": self.question2.text,
                        "question_type": self.question2.question_type,
                        "mcq": None,
                    },
                    {
                        "id": self.question3.id,
                        "text": self.question3.text,
                        "question_type": self.question3.question_type,
                        "mcq": {
                            "option1": self.multiple_choice_question.option1,
                            "option2": self.multiple_choice_question.option2,
                            "option3": self.multiple_choice_question.option3,
                            "option4": self.multiple_choice_question.option4,
                            "correct_option": self.multiple_choice_question.correct_option,
                        },
                    },
                ],
            },
        )

    def test_get_non_existing_questionbank_details_as_admin(self):
        response = self.admin_client.get(
            f"/api/question_banks/{self.questionbank.id+1}/questions/"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
