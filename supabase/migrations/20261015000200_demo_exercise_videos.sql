-- The demo workspace's original eight exercises had no video. Give them one (only where none is set).
with v(name, vid) as (values
  ('Back Squat', '8PMjqgR8Wa8'), ('Bench Press', '8ayErjKZovc'), ('Bent-Over Row', 'l64i5zVjCu0'), ('Burpee', 'fZx6nxKMq4E'),
  ('Kettlebell Swing', 'v3wnrSluDcw'), ('Plank', 'ASdvN_XEl_c'), ('Romanian Deadlift', 'lKLYvNGz6mk'), ('Wall Ball', 'D653dvXxg5k')
)
update public.exercises e
   set video_url = 'https://www.youtube.com/watch?v=' || v.vid, video_provider = 'youtube', video_id = v.vid,
       thumbnail_url = 'https://i.ytimg.com/vi/' || v.vid || '/hqdefault.jpg', link_status = 'unchecked'
  from v
 where lower(e.name) = lower(v.name) and e.video_id is null;
