-- Expand activities library for «برنامه روزانه و فعالیت‌ها» checklist.
-- Single statement (phpMyAdmin ajax runs one statement per request).

INSERT INTO activities (name, slug, icon, sort_order, is_active)
SELECT v.name, v.slug, NULL, v.sort_order, 1
FROM (
  SELECT 'ورزش' AS name, 'light_exercise' AS slug, 10 AS sort_order UNION ALL
  SELECT 'پیاده‌روی', 'walking', 20 UNION ALL
  SELECT 'نرمش', 'stretching', 30 UNION ALL
  SELECT 'فعالیت‌های گروهی', 'group_activities', 40 UNION ALL
  SELECT 'بازی و سرگرمی', 'game_entertainment', 50 UNION ALL
  SELECT 'موسیقی', 'music', 60 UNION ALL
  SELECT 'نقاشی و کاردستی', 'art_craft', 70 UNION ALL
  SELECT 'کتاب‌خوانی', 'reading', 80 UNION ALL
  SELECT 'برنامه‌های مذهبی و فرهنگی', 'religious_cultural', 90 UNION ALL
  SELECT 'جشن‌ها و مناسبت‌ها', 'celebrations', 100 UNION ALL
  SELECT 'گردش و اردو', 'trips_outings', 110 UNION ALL
  SELECT 'برنامه‌های بین‌نسلی', 'intergenerational', 120 UNION ALL
  SELECT 'کلاس آموزشی', 'educational_class', 130 UNION ALL
  SELECT 'جلسات روان‌شناسی گروهی', 'group_psychology', 140 UNION ALL
  SELECT 'برنامه‌های اجتماعی', 'social_programs', 150 UNION ALL
  SELECT 'کارگاه‌ها و فعالیت‌های خلاق', 'creative_workshops', 160
) AS v
WHERE NOT EXISTS (
  SELECT 1 FROM activities a WHERE a.slug = v.slug
);
