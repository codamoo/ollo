CREATE OR REPLACE FUNCTION get_profiles_with_follower_counts()
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  is_verified boolean,
  followers_count bigint
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.is_verified,
    COUNT(f.follower_id)::bigint AS followers_count
  FROM 
    profiles p
  LEFT JOIN 
    follows f ON p.id = f.following_id
  WHERE 
    p.username IS NOT NULL
  GROUP BY 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.is_verified
  ORDER BY
    COUNT(f.follower_id) DESC;
END;
$$;
