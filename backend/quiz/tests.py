from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from user.models import User
from course.models import Course
from questionbank.models import QuestionBank
from question.models import Question, MultipleChoiceOption
from quiz.models import Quiz
from questionresponse.models import QuestionResponse

from course.models import Course, CourseProgress

class QuizTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='student', password='password')
        self.teacher = User.objects.create_user(username='teacher', password='password', is_teacher=True)
        
        self.course = Course.objects.create(title="Test Course", description="Desc", instructor=self.teacher)
        # Enroll student
        CourseProgress.objects.create(user=self.user, course=self.course)
        
        self.bank = QuestionBank.objects.create(title="Bank 1", user=self.teacher)
        # MultipleChoiceOption inherits from Question, so create it directly
        self.question = MultipleChoiceOption.objects.create(
            text="What is 2+2?",
            is_open_ended=False,
            option1="1", option2="2", option3="3", option4="4",
            correct_option=4
        )
        self.bank.questions.add(self.question)
        
        self.quiz = Quiz.objects.create(
            title="Test Quiz",
            description="Test Desc",
            time_limit_in_minutes=10,
            course=self.course,
            show_correct_answers_on_completion=True
        )
        self.quiz.question_banks.add(self.bank)
        
        # Authenticate as student
        self.client.force_authenticate(user=self.user)

    def test_submit_quiz(self):
        url = reverse('quiz-submit', args=[self.quiz.id])
        data = {
            'responses': [
                {'question_id': self.question.id, 'answer': 4}
            ]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify response saved
        self.assertTrue(QuestionResponse.objects.filter(user=self.user, question=self.question).exists())
        self.assertEqual(QuestionResponse.objects.get(user=self.user, question=self.question).selected_option, 4)

    def test_review_quiz_allowed(self):
        # First submit
        QuestionResponse.objects.create(user=self.user, question=self.question, selected_option=4)
        
        url = reverse('quiz-review', args=[self.quiz.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('questions', response.data)
        self.assertIn('responses', response.data)
        self.assertEqual(response.data['responses'][0]['is_correct'], True)

    def test_review_quiz_not_finished(self):
        url = reverse('quiz-review', args=[self.quiz.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_review_quiz_not_allowed_by_config(self):
        self.quiz.show_correct_answers_on_completion = False
        self.quiz.save()
        
        # Submit
        QuestionResponse.objects.create(user=self.user, question=self.question, selected_option=4)
        
        url = reverse('quiz-review', args=[self.quiz.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
