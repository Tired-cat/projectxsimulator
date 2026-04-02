UPDATE sessions 
SET class_id = se.class_id
FROM student_enrollments se
WHERE sessions.user_id = se.user_id
  AND sessions.class_id IS NULL;