
CREATE OR REPLACE FUNCTION increment_reassignments(task_id bigint)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    current_count integer;
BEGIN
    SELECT contador_reasignaciones INTO current_count
    FROM tarea
    WHERE id = task_id;
    
    RETURN COALESCE(current_count, 0) + 1;
END;
$$;
