"""/api/public-profiles/{publicId} — публичный профиль сотрудника."""
import uuid

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import User, UserProject, UserSkill


class PublicProfileView(APIView):
    def get(self, request, public_id: uuid.UUID):
        try:
            user = User.objects.get(public_id=public_id)
        except User.DoesNotExist:
            return Response(
                {"error": "Пользователь не найден"},
                status=status.HTTP_404_NOT_FOUND,
            )

        skills = (
            UserSkill.objects.select_related("skill")
            .filter(user_id=user.id, skill__isnull=False)
            .order_by("skill__name")
        )

        projects = (
            UserProject.objects.select_related("project")
            .filter(user_id=user.id)
            .order_by("project__name")
        )

        return Response(
            {
                "user": {
                    "publicId": user.public_id,
                    "email": user.email,
                    "fullName": user.full_name,
                    "position": user.position,
                    "department": user.department,
                    "role": user.role,
                },
                "skills": [
                    {
                        "userSkillId": us.id,
                        "skillId": us.skill_id,
                        "name": us.skill.name,
                        "category": us.skill.category,
                        "level": us.level,
                        "createdAt": us.created_at,
                        "updatedAt": us.updated_at,
                    }
                    for us in skills
                ],
                "projects": [
                    {
                        "id": up.project.id,
                        "name": up.project.name,
                        "description": up.project.description,
                        "status": up.project.status,
                        "startDate": up.project.start_date,
                        "endDate": up.project.end_date,
                        "joinedAt": up.joined_at,
                    }
                    for up in projects
                ],
            }
        )
