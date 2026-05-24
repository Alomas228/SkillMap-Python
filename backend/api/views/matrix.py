"""/api/matrix — матрица компетенций сотрудников (Manager/HR)."""
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Skill, User
from ..permissions import IsHROrManager


class MatrixView(APIView):
    permission_classes = [IsHROrManager]

    def get(self, request):
        users = (
            User.objects.prefetch_related("user_skills__skill")
            .order_by("full_name")
            .all()
        )
        users = list(users)

        skills = list(
            Skill.objects.filter(is_active=True).order_by("category", "name")
        )

        departments = sorted(
            {u.department for u in users if (u.department or "").strip()}
        )

        employees = []
        all_user_skills = []
        experts_count = 0

        for u in users:
            user_skills = list(u.user_skills.all())
            user_skills = [us for us in user_skills if us.skill is not None]
            all_user_skills.extend(user_skills)
            if any(us.level == "Senior" for us in user_skills):
                experts_count += 1

            user_skills.sort(key=lambda us: (us.skill.category or "", us.skill.name or ""))

            employees.append(
                {
                    "publicId": u.public_id,
                    "fullName": u.full_name,
                    "position": u.position,
                    "department": u.department,
                    "role": u.role,
                    "skills": [
                        {
                            "skillId": us.skill_id,
                            "skillName": us.skill.name,
                            "skillCategory": us.skill.category,
                            "level": us.level,
                            "createdAt": us.created_at,
                            "updatedAt": us.updated_at,
                        }
                        for us in user_skills
                    ],
                }
            )

        stats = {
            "totalEmployees": len(users),
            "uniqueSkills": len(skills),
            "experts": experts_count,
            "seniorCount": sum(1 for us in all_user_skills if us.level == "Senior"),
            "middleCount": sum(1 for us in all_user_skills if us.level == "Middle"),
            "juniorCount": sum(1 for us in all_user_skills if us.level == "Junior"),
            "internCount": sum(1 for us in all_user_skills if us.level == "Intern"),
        }

        return Response(
            {
                "stats": stats,
                "departments": departments,
                "skills": [
                    {"id": s.id, "name": s.name, "category": s.category}
                    for s in skills
                ],
                "employees": employees,
            }
        )
