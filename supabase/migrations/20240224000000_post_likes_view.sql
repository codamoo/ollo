-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_posts_with_likes(text, text);

-- Create a function to get posts with like counts and user like status
CREATE OR REPLACE FUNCTION get_posts_with_likes(
  viewer_id text, -- Changed to text to handle null and UUID strings
  profile_username text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  content text,
  type text,
  media_url text[],
  created_at timestamptz,
  likes_count bigint,
  is_liked boolean,
  author_username text,
  author_display_name text,
  author_avatar_url text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.content,
    p.type,
    p.media_url,
    p.created_at,
    COALESCE(COUNT(DISTINCT l.id), 0)::bigint AS likes_count,
    CASE 
      WHEN viewer_id IS NULL THEN false
      ELSE EXISTS (
        SELECT 1 
        FROM likes ul 
        WHERE ul.post_id = p.id 
        AND ul.user_id = viewer_id::uuid
      )
    END AS is_liked,
    pr.username AS author_username,
    pr.display_name AS author_display_name,
    pr.avatar_url AS author_avatar_url
  FROM posts p
  LEFT JOIN profiles pr ON p.user_id = pr.id  -- Changed INNER JOIN to LEFT JOIN
  LEFT JOIN likes l ON p.id = l.post_id
  WHERE 
    CASE 
      WHEN profile_username IS NOT NULL THEN
        pr.username = profile_username
      ELSE true
    END
  GROUP BY 
    p.id,
    p.user_id,
    p.content,
    p.type,
    p.media_url,
    p.created_at,
    pr.username,
    pr.display_name,
    pr.avatar_url
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Example usage:
-- Get all posts: SELECT * FROM get_posts_with_likes('user-uuid');
-- Get user's posts: SELECT * FROM get_posts_with_likes('viewer-uuid', 'username');

-- Create a view for posts with likes
DROP VIEW IF EXISTS posts_with_likes;
CREATE VIEW posts_with_likes AS
SELECT 
  p.id,
  p.user_id,
  p.content,
  p.type,
  p.media_url,
  p.created_at,
  COUNT(l.id) AS likes_count
FROM posts p
LEFT JOIN likes l ON p.id = l.post_id
GROUP BY p.id;

-- Enable RLS on the view
ALTER VIEW posts_with_likes SET (security_invoker = true);

-- Create policies for the view
CREATE POLICY "Posts with likes are viewable by everyone"
  ON posts_with_likes FOR SELECT
  USING (true);
