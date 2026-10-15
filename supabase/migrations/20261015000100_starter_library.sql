-- Starter exercise library: 138 movements, each with a linked YouTube demonstration.
-- Seeded into every existing workspace and into each new coach workspace. Names that already exist are skipped.

create schema if not exists private;

create or replace function private.seed_starter_library(p_workspace uuid) returns integer
language plpgsql security definer set search_path = ''
as $$
declare n integer;
begin
  with starter(name, measured_as, tags, equipment, video_id, cues) as (values
    ('Bulgarian Split Squat', 'weight_reps', array['legs','glutes']::text[], array['dumbbell','barbell']::text[], 'VPhhE6bBzZE', 'Rear foot up, torso tall, drop straight down.'),
    ('Split Squat', 'weight_reps', array['legs']::text[], array['dumbbell']::text[], '4aqrcebiFZo', 'Long stance, back knee toward the floor.'),
    ('Reverse Lunge', 'weight_reps', array['legs','glutes']::text[], array['dumbbell','barbell']::text[], 'u_zSfK5ZFU4', 'Step back, front shin vertical.'),
    ('Lateral Lunge', 'weight_reps', array['legs','glutes']::text[], array['dumbbell','bodyweight']::text[], 'Vx6mQXEj8kw', 'Sit back into the hip, keep the other leg straight.'),
    ('Step-up', 'weight_reps', array['legs','glutes']::text[], array['dumbbell','other']::text[], 'URHdW9js6DM', 'Drive through the whole foot, do not push off the back leg.'),
    ('Hack Squat', 'weight_reps', array['legs']::text[], array['machine']::text[], 'fE5BWPy7uRc', 'Feet shoulder width, control the descent.'),
    ('Leg Press', 'weight_reps', array['legs']::text[], array['machine']::text[], 'cDGOn-yfKJA', 'Lower back stays on the pad, do not lock the knees.'),
    ('Leg Extension', 'weight_reps', array['legs']::text[], array['machine']::text[], 'MXvSzXEBOTI', 'Pause at the top, slow lowering.'),
    ('Lying Leg Curl', 'weight_reps', array['legs']::text[], array['machine']::text[], 'vl5nUdE9mWM', 'Hips down, curl heels to glutes.'),
    ('Seated Leg Curl', 'weight_reps', array['legs']::text[], array['machine']::text[], '_2Kd0d-JEUM', 'Pin the thighs, full range.'),
    ('Hip Thrust', 'weight_reps', array['glutes','legs']::text[], array['barbell']::text[], 'S_uZP4UH6J0', 'Chin tucked, ribs down, squeeze at the top.'),
    ('Glute Bridge', 'reps', array['glutes']::text[], array['bodyweight']::text[], 'Q_Bpj91Yiis', 'Heels close, push the floor away, squeeze.'),
    ('Single-Leg Romanian Deadlift', 'weight_reps', array['legs','glutes']::text[], array['dumbbell','kettlebell']::text[], 'Zfr6wizR8rs', 'Hips square, long spine, soft standing knee.'),
    ('Good Morning', 'weight_reps', array['legs','pull']::text[], array['barbell']::text[], 'f23vXjoG2e8', 'Hinge at the hips, flat back.'),
    ('Sumo Deadlift', 'weight_reps', array['pull','legs']::text[], array['barbell']::text[], 'fKrujxCPRKI', 'Wide stance, knees out, chest up.'),
    ('Trap Bar Deadlift', 'weight_reps', array['pull','legs']::text[], array['other']::text[], 'HCFTFM8jIwg', 'Stand tall, drive the floor away.'),
    ('Zercher Squat', 'weight_reps', array['legs','core']::text[], array['barbell']::text[], 'Qq3yteWfVGE', 'Bar in the elbows, stay upright.'),
    ('Pistol Squat', 'reps', array['legs']::text[], array['bodyweight']::text[], 'J19cXMqJ43o', 'Control down, heel stays planted.'),
    ('Jump Squat', 'reps', array['legs']::text[], array['bodyweight']::text[], '8Sl9h44XNJA', 'Land softly, reset each rep.'),
    ('Standing Calf Raise', 'weight_reps', array['legs']::text[], array['machine','dumbbell']::text[], 'ndQc4mz4mBU', 'Full stretch at the bottom, pause at the top.'),
    ('Seated Calf Raise', 'weight_reps', array['legs']::text[], array['machine']::text[], '6O5hh1rBtx8', 'Slow tempo, full range.'),
    ('Nordic Hamstring Curl', 'reps', array['legs']::text[], array['bodyweight']::text[], '_e9vFU9-tkc', 'Lower as slowly as you can, hips extended.'),
    ('Wall Sit', 'time', array['legs']::text[], array['bodyweight']::text[], 'cWTZ8Am1Ee0', 'Thighs parallel, back flat on the wall.'),
    ('Incline Bench Press', 'weight_reps', array['push']::text[], array['barbell']::text[], '5kyLUGVq_pk', 'Bar to upper chest, elbows about 45 degrees.'),
    ('Dumbbell Bench Press', 'weight_reps', array['push']::text[], array['dumbbell']::text[], '5Y3VZsLb1Ys', 'Deep stretch, press up and slightly in.'),
    ('Incline Dumbbell Press', 'weight_reps', array['push']::text[], array['dumbbell']::text[], 'OC7Qs_SAO2E', 'Bench at 30 degrees, control the bottom.'),
    ('Close-Grip Bench Press', 'weight_reps', array['push','arms']::text[], array['barbell']::text[], 'UYJsFzqdgK4', 'Hands shoulder width, elbows tucked.'),
    ('Dumbbell Fly', 'weight_reps', array['push']::text[], array['dumbbell']::text[], 'QENKPHhQVi4', 'Soft elbows, wide arc, feel the stretch.'),
    ('Cable Fly', 'weight_reps', array['push']::text[], array['machine']::text[], 'QcTcWpkn_bw', 'Hug a tree, squeeze at the middle.'),
    ('Chest Dip', 'reps', array['push']::text[], array['bodyweight']::text[], '8xBVaG7tfbQ', 'Lean forward, lower until shoulders are below elbows.'),
    ('Bench Dip', 'reps', array['push','arms']::text[], array['bodyweight']::text[], 'WVeZDBhZwLA', 'Elbows back, shoulders down.'),
    ('Diamond Push-up', 'reps', array['push','arms']::text[], array['bodyweight']::text[], '8_ILkbB9an8', 'Hands under the chest, elbows brush the ribs.'),
    ('Decline Push-up', 'reps', array['push']::text[], array['bodyweight']::text[], '5QFjmotLfW4', 'Feet up, body in one line.'),
    ('Pike Push-up', 'reps', array['push','shoulders']::text[], array['bodyweight']::text[], 'CDBKxS-a4qQ', 'Hips high, head travels between the hands.'),
    ('Handstand Push-up', 'reps', array['push','shoulders']::text[], array['bodyweight']::text[], 'FaRge9WFzWg', 'Stack the ribs over the hips, head to the floor.'),
    ('Seated Dumbbell Shoulder Press', 'weight_reps', array['push','shoulders']::text[], array['dumbbell']::text[], 'WKEl69bIGus', 'Press straight up, ribs down.'),
    ('Arnold Press', 'weight_reps', array['push','shoulders']::text[], array['dumbbell']::text[], '6Z15_WdXmVw', 'Rotate smoothly as you press.'),
    ('Push Press', 'weight_reps', array['push','shoulders']::text[], array['barbell']::text[], 'a8HQo8z20Uo', 'Dip and drive with the legs, finish locked out.'),
    ('Lateral Raise', 'weight_reps', array['shoulders']::text[], array['dumbbell']::text[], 'Y29xKcze8Ik', 'Lead with the elbows, stop at shoulder height.'),
    ('Front Raise', 'weight_reps', array['shoulders']::text[], array['dumbbell']::text[], 'YiGbp-iKDwQ', 'Smooth lift to eye level, no swinging.'),
    ('Rear Delt Fly', 'weight_reps', array['shoulders','pull']::text[], array['dumbbell']::text[], 'p7YER_nABrI', 'Hinge forward, open the arms wide.'),
    ('Face Pull', 'weight_reps', array['shoulders','pull']::text[], array['bands','machine']::text[], 'eQaSpG7aMYQ', 'Pull to the forehead, elbows high.'),
    ('Upright Row', 'weight_reps', array['shoulders']::text[], array['barbell','dumbbell']::text[], '93BUvCE92As', 'Elbows lead, bar close to the body.'),
    ('Tricep Pushdown', 'weight_reps', array['arms']::text[], array['machine']::text[], 'ozwo9RGm7QU', 'Elbows pinned to the sides, full lockout.'),
    ('Overhead Tricep Extension', 'weight_reps', array['arms']::text[], array['dumbbell']::text[], 'Sz55mTpAGoo', 'Elbows point forward, deep stretch.'),
    ('Skull Crusher', 'weight_reps', array['arms']::text[], array['barbell','dumbbell']::text[], 'ShR_FM3-wm4', 'Lower to the forehead, upper arms still.'),
    ('Chin-up', 'reps', array['pull','arms']::text[], array['bodyweight']::text[], 'mGm7kDOSrkM', 'Palms facing you, chest to the bar.'),
    ('Lat Pulldown', 'weight_reps', array['pull']::text[], array['machine']::text[], 'RTNmVfnRitA', 'Pull the elbows to the ribs, chest up.'),
    ('Close-Grip Lat Pulldown', 'weight_reps', array['pull']::text[], array['machine']::text[], 'hkZWmvkbNNQ', 'Neutral grip, lean back slightly.'),
    ('Barbell Row', 'weight_reps', array['pull']::text[], array['barbell']::text[], 'ML1L5ytxLMY', 'Hinge, flat back, pull to the belly.'),
    ('Pendlay Row', 'weight_reps', array['pull']::text[], array['barbell']::text[], 'h4nkoayPFWw', 'Bar starts on the floor each rep.'),
    ('Seated Cable Row', 'weight_reps', array['pull']::text[], array['machine']::text[], 'EU7bOadUsNI', 'Tall chest, pull to the stomach.'),
    ('Chest-Supported Row', 'weight_reps', array['pull']::text[], array['dumbbell','machine']::text[], 'gdoaioGPXfE', 'Chest on the pad, squeeze the shoulder blades.'),
    ('T-Bar Row', 'weight_reps', array['pull']::text[], array['machine','barbell']::text[], 'rvbjGSQ2tVE', 'Flat back, elbows past the ribs.'),
    ('Inverted Row', 'reps', array['pull']::text[], array['bodyweight']::text[], 'Ckq4AocVupo', 'Body straight, chest to the bar.'),
    ('Single-Arm Cable Row', 'weight_reps', array['pull']::text[], array['machine']::text[], '1jN6qeXdvWA', 'Rotate slightly, drive the elbow back.'),
    ('Straight-Arm Pulldown', 'weight_reps', array['pull']::text[], array['machine']::text[], 'duHQk2PxNos', 'Arms long, sweep to the thighs.'),
    ('Barbell Shrug', 'weight_reps', array['pull','shoulders']::text[], array['barbell','dumbbell']::text[], 'KbsQ1E8Hg0o', 'Straight up and down, no rolling.'),
    ('Rack Pull', 'weight_reps', array['pull']::text[], array['barbell']::text[], 'DizJXKoHBJw', 'Bar at the knee, lock the hips.'),
    ('Muscle-up', 'reps', array['pull','push']::text[], array['bodyweight']::text[], 'HsWhfh0cMW0', 'Pull explosively, transition over the bar.'),
    ('Scapular Pull-up', 'reps', array['pull','shoulders']::text[], array['bodyweight']::text[], '-ZIpSoTRsuE', 'Hang, then depress the shoulder blades only.'),
    ('Barbell Curl', 'weight_reps', array['arms']::text[], array['barbell']::text[], 'KCH2RlxbIbo', 'Elbows at the sides, no swinging.'),
    ('Dumbbell Curl', 'weight_reps', array['arms']::text[], array['dumbbell']::text[], 'tE21E4kzXJI', 'Supinate as you lift, slow lowering.'),
    ('Hammer Curl', 'weight_reps', array['arms']::text[], array['dumbbell']::text[], 'G7hy-AxQwcQ', 'Thumbs up, elbows still.'),
    ('Incline Dumbbell Curl', 'weight_reps', array['arms']::text[], array['dumbbell']::text[], 'PAnypqTfEuU', 'Arms hang behind the body, full stretch.'),
    ('Preacher Curl', 'weight_reps', array['arms']::text[], array['barbell','machine']::text[], 'BPmUhDtdQfw', 'Upper arms flat on the pad.'),
    ('Cable Curl', 'weight_reps', array['arms']::text[], array['machine']::text[], '2MUEL4nL6hA', 'Constant tension, squeeze at the top.'),
    ('Reverse Curl', 'weight_reps', array['arms']::text[], array['barbell']::text[], '10AFVfSUzsU', 'Overhand grip, wrists straight.'),
    ('Wrist Curl', 'weight_reps', array['arms']::text[], array['dumbbell']::text[], 'JtZ_iT8rn70', 'Forearms on the thighs, curl through the wrist.'),
    ('Dead Bug', 'reps', array['core']::text[], array['bodyweight']::text[], '-gRN_JyVTLY', 'Lower back stays flat, opposite arm and leg.'),
    ('Bird Dog', 'reps', array['core']::text[], array['bodyweight']::text[], 'Y_NGGmPH8zA', 'Hips square, reach long.'),
    ('Side Plank', 'time', array['core']::text[], array['bodyweight']::text[], '0M-erHBl48U', 'Stack the feet, hips high.'),
    ('Hanging Leg Raise', 'reps', array['core']::text[], array['bodyweight']::text[], 'JXztA3fLp50', 'No swing, curl the pelvis up.'),
    ('Hanging Knee Raise', 'reps', array['core']::text[], array['bodyweight']::text[], '0BmrlKCfTPU', 'Knees to the chest, slow down.'),
    ('Toes to Bar', 'reps', array['core']::text[], array['bodyweight']::text[], 'XCmbnIndiFc', 'Tight kip, toes touch the bar.'),
    ('Cable Crunch', 'weight_reps', array['core']::text[], array['machine']::text[], '809A_MuZ2PY', 'Round the spine, elbows to knees.'),
    ('Ab Wheel Rollout', 'reps', array['core']::text[], array['other']::text[], 'NbudTqiwguk', 'Ribs down, roll as far as you can control.'),
    ('Russian Twist', 'reps', array['core']::text[], array['bodyweight','other']::text[], 'jjyR6Z1U4dA', 'Lean back, rotate the ribcage.'),
    ('Bicycle Crunch', 'reps', array['core']::text[], array['bodyweight']::text[], 'kDPxFoCmb-w', 'Slow, elbow to opposite knee.'),
    ('V-up', 'reps', array['core']::text[], array['bodyweight']::text[], 'iP2fjvG0g3w', 'Reach for the toes, legs straight.'),
    ('Flutter Kick', 'time', array['core']::text[], array['bodyweight']::text[], '6D23AyECRGQ', 'Lower back pressed down, small fast kicks.'),
    ('Lying Leg Raise', 'reps', array['core']::text[], array['bodyweight']::text[], 'xJJu-WiROM8', 'Lower slowly, back stays flat.'),
    ('Crunch', 'reps', array['core']::text[], array['bodyweight']::text[], 'GWIEON0VSaY', 'Curl the ribs to the pelvis.'),
    ('Pallof Press', 'reps', array['core']::text[], array['bands','machine']::text[], 'iBDXkpKDRy8', 'Resist the rotation, press straight out.'),
    ('Cable Woodchop', 'weight_reps', array['core']::text[], array['machine']::text[], 'M01L6jdva_0', 'Rotate through the hips, arms long.'),
    ('Hollow Rock', 'reps', array['core']::text[], array['bodyweight']::text[], 'V72HS7BV42g', 'Stay in the hollow, rock as one piece.'),
    ('Plank Shoulder Tap', 'reps', array['core']::text[], array['bodyweight']::text[], 'NV55raYCP0E', 'Hips stay still while the hand lifts.'),
    ('L-sit', 'time', array['core']::text[], array['bodyweight']::text[], '-im8Yb3df38', 'Press down, legs straight and level.'),
    ('Suitcase Carry', 'distance', array['core','full body']::text[], array['kettlebell','dumbbell']::text[], 'CgJup_IrnCw', 'Stay tall, do not lean.'),
    ('Reverse Crunch', 'reps', array['core']::text[], array['bodyweight']::text[], '7VH0UB44RT0', 'Curl the hips off the floor, no momentum.'),
    ('Back Extension', 'reps', array['pull','core']::text[], array['bodyweight','machine']::text[], 'gLT-WLH84B4', 'Hinge at the hips, glutes squeezed.'),
    ('Power Clean', 'weight_reps', array['full body']::text[], array['barbell']::text[], 'lI35socHJ4k', 'Jump and shrug, catch high.'),
    ('Hang Power Clean', 'weight_reps', array['full body']::text[], array['barbell']::text[], 'eS6VypYM3kc', 'Hips back, extend, pull under.'),
    ('Clean and Jerk', 'weight_reps', array['full body']::text[], array['barbell']::text[], 'P_AF6vkrHk8', 'Clean to the rack, dip, drive, split.'),
    ('Barbell Snatch', 'weight_reps', array['full body']::text[], array['barbell']::text[], '3O7JjPr0_ok', 'Wide grip, extend fully, pull under.'),
    ('Power Snatch', 'weight_reps', array['full body']::text[], array['barbell']::text[], 'zUYMUr-m084', 'Catch above parallel, lock the arms.'),
    ('Push Jerk', 'weight_reps', array['full body','push']::text[], array['barbell']::text[], 'Q8NK4eOe_74', 'Dip, drive, punch under the bar.'),
    ('Dumbbell Snatch', 'weight_reps', array['full body']::text[], array['dumbbell']::text[], 'U48gSsH3LIk', 'Hip drive, punch the dumbbell overhead.'),
    ('Kettlebell Snatch', 'weight_reps', array['full body']::text[], array['kettlebell']::text[], 'XHlXPW8R3OU', 'Swing, pull, punch through.'),
    ('Kettlebell Clean', 'weight_reps', array['full body']::text[], array['kettlebell']::text[], 'ZJuFcYWgHdQ', 'Hip drive, keep the bell close.'),
    ('Turkish Get-up', 'weight_reps', array['full body','core']::text[], array['kettlebell']::text[], '5aEOAPJQ4w0', 'Eyes on the bell, move in clear steps.'),
    ('Kettlebell Halo', 'weight_reps', array['shoulders','core']::text[], array['kettlebell']::text[], 'Sci3lijQBmk', 'Circle the head, ribs down.'),
    ('Dumbbell Thruster', 'weight_reps', array['full body']::text[], array['dumbbell']::text[], 'tJP-fwf5ASA', 'Squat deep, press as you rise.'),
    ('Man Maker', 'reps', array['full body']::text[], array['dumbbell']::text[], 'ni2jUhihLuw', 'Push-up, row, clean, press.'),
    ('Devil''s Press', 'reps', array['full body']::text[], array['dumbbell']::text[], 'PpexZbPjhI4', 'Burpee over the bells, swing to overhead.'),
    ('Burpee Box Jump', 'reps', array['full body']::text[], array['other']::text[], 'QJTztnjOoMM', 'Burpee, then jump onto the box.'),
    ('Double Under', 'reps', array['cardio']::text[], array['other']::text[], 'apZi9pYxhKY', 'Wrists turn the rope, small hops.'),
    ('Jump Rope', 'time', array['cardio']::text[], array['other']::text[], 'sItjsiyzTAM', 'Light bounces, elbows close.'),
    ('Sled Push', 'distance', array['full body','legs']::text[], array['other']::text[], '1PmO6kzBEc8', 'Low hips, drive with long steps.'),
    ('Sled Pull', 'distance', array['full body','legs']::text[], array['other']::text[], 't081dogLJsU', 'Lean back, walk it in.'),
    ('Battle Ropes', 'time', array['cardio','full body']::text[], array['other']::text[], 'FSrWqBV1zXM', 'Hips back, make waves.'),
    ('Ski Erg', 'distance', array['cardio','full body']::text[], array['machine']::text[], 'SeX0dZxdyTQ', 'Hinge and pull through the hips.'),
    ('Treadmill Run', 'distance', array['cardio']::text[], array['machine']::text[], 'aKfJJ1TuyE4', 'Relaxed shoulders, quick light steps.'),
    ('Sprint', 'distance', array['cardio','legs']::text[], array['bodyweight']::text[], '6m_fjNhRhkY', 'Tall posture, drive the knees.'),
    ('Bear Crawl', 'distance', array['full body','core']::text[], array['bodyweight']::text[], 'rHDYv63a-VM', 'Knees hover, move opposite limbs.'),
    ('Inchworm', 'reps', array['mobility','core']::text[], array['bodyweight']::text[], 'ml3MdmCkwbQ', 'Walk out to a plank, walk back, legs straight.'),
    ('World''s Greatest Stretch', 'reps', array['mobility']::text[], array['bodyweight']::text[], '-CiWQ2IvY34', 'Deep lunge, rotate and reach to the sky.'),
    ('Cat-Cow', 'reps', array['mobility']::text[], array['bodyweight']::text[], 'KT6Fk7FWYfM', 'Move one vertebra at a time.'),
    ('90/90 Hip Switch', 'reps', array['mobility']::text[], array['bodyweight']::text[], 'HUZimFZJZWU', 'Sit tall, switch sides without the hands.'),
    ('Couch Stretch', 'time', array['mobility']::text[], array['bodyweight']::text[], 'fRvDt6mHW60', 'Squeeze the glute of the back leg.'),
    ('Kneeling Hip Flexor Stretch', 'time', array['mobility']::text[], array['bodyweight']::text[], 'KT0HlPGCl6k', 'Tuck the pelvis, shift forward.'),
    ('Hamstring Stretch', 'time', array['mobility']::text[], array['bodyweight']::text[], '2s2t3mEYZNo', 'Long spine, hinge forward.'),
    ('Pigeon Pose', 'time', array['mobility']::text[], array['bodyweight']::text[], 'JGEHLp-Bhzc', 'Square the hips, fold forward.'),
    ('Thoracic Rotation', 'reps', array['mobility']::text[], array['bodyweight']::text[], 'mGtD0v5uOiQ', 'Rotate from the upper back, hips still.'),
    ('Band Shoulder Dislocate', 'reps', array['mobility','shoulders']::text[], array['bands']::text[], 'riVxa9By-pM', 'Wide grip, arms stay straight.'),
    ('Wall Slide', 'reps', array['mobility','shoulders']::text[], array['bodyweight']::text[], 'ab2pQvk8utE', 'Keep the arms and back on the wall.'),
    ('Ankle Mobility Drill', 'reps', array['mobility']::text[], array['bodyweight']::text[], 'Y1IZXkdPPdw', 'Knee over toes, heel stays down.'),
    ('Deep Squat Hold', 'time', array['mobility','legs']::text[], array['bodyweight']::text[], '0wzrgyAurT8', 'Heels down, chest tall.'),
    ('Child''s Pose', 'time', array['mobility']::text[], array['bodyweight']::text[], 'EniGBCHAEVQ', 'Sink the hips back, breathe.'),
    ('Downward Dog', 'time', array['mobility']::text[], array['bodyweight']::text[], 'fjJlzniDqKQ', 'Push the floor away, long spine.'),
    ('High Knees', 'time', array['cardio']::text[], array['bodyweight']::text[], 'OpN2Y712k6Y', 'Knees to hip height, stay tall.'),
    ('Jumping Jack', 'reps', array['cardio']::text[], array['bodyweight']::text[], 'nGaXj3kkmrU', 'Land softly, move in rhythm.'),
    ('Skater Jump', 'reps', array['cardio','legs']::text[], array['bodyweight']::text[], '95Qxcy9xm0U', 'Leap sideways, land on one leg.'),
    ('Jumping Lunge', 'reps', array['legs','cardio']::text[], array['bodyweight']::text[], 'hqCO8W4OD_Y', 'Switch in the air, land soft.'),
    ('Tuck Jump', 'reps', array['legs','cardio']::text[], array['bodyweight']::text[], '-bnJGikRGsM', 'Knees to the chest, land soft.'),
    ('Dead Hang', 'time', array['pull']::text[], array['bodyweight']::text[], 'g0I7Jv3oqKw', 'Shoulders packed, grip tight.'),
    ('Band-Assisted Pull-up', 'reps', array['pull']::text[], array['bands','bodyweight']::text[], '4yE-XGDWJPg', 'Full hang, chin over the bar.'),
    ('Banded Lateral Walk', 'reps', array['glutes','legs']::text[], array['bands']::text[], 'cbDudaLroVs', 'Stay low, toes forward, small steps.')
  ), added as (
    insert into public.exercises (workspace_id, name, video_url, video_provider, video_id, thumbnail_url, equipment, tags, measured_as, cues, link_status)
    select p_workspace, s.name, 'https://www.youtube.com/watch?v=' || s.video_id, 'youtube', s.video_id,
           'https://i.ytimg.com/vi/' || s.video_id || '/hqdefault.jpg', s.equipment, s.tags, s.measured_as, s.cues, 'unchecked'
    from starter s
    where not exists (select 1 from public.exercises e where e.workspace_id = p_workspace and lower(e.name) = lower(s.name))
    returning 1
  )
  select count(*) into n from added;
  return n;
end $$;

revoke all on function private.seed_starter_library(uuid) from public, anon, authenticated;

-- New coaches start with the library.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $f$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role text := meta ->> 'role';
  v_name text := coalesce(nullif(trim(meta ->> 'name'), ''), split_part(new.email, '@', 1));
  v_workspace uuid;
begin
  if v_role = 'coach' then
    insert into public.workspaces (name, owner_id)
    values (coalesce(nullif(trim(meta ->> 'workspace_name'), ''), v_name || '''s workspace'), new.id)
    returning id into v_workspace;
    perform private.seed_starter_library(v_workspace);
  elsif v_role = 'client' then
    select workspace_id into v_workspace from public.workspace_invites
    where code = upper(trim(meta ->> 'invite_code')) and revoked_at is null;
    if v_workspace is null then
      raise exception 'That invite code is not valid. Ask your coach for a new one.' using errcode = 'check_violation';
    end if;
  else
    raise exception 'Sign-up needs a role.' using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, workspace_id, role, name, email)
  values (new.id, v_workspace, v_role, v_name, new.email);
  return new;
end $f$;

-- Existing workspaces.
select private.seed_starter_library(id) from public.workspaces;
