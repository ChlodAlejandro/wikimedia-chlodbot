SELECT
    REPLACE(p1.`page_title`, "_", " ") AS `page_title`,
    `rev_id` AS `s_last_id`,
    DATE_FORMAT(`rev_timestamp`, "%Y-%m-%d %H:%i:%s") AS `s_last_time`,
    `actor_name` AS `s_last_actor`,
    `page_len` AS `s_length`,
    (CASE `t_importance`
         WHEN "Unknown-importance_Philippine-related_articles" THEN 1
         WHEN "Low-importance_Philippine-related_articles" THEN 2
         WHEN "Mid-importance_Philippine-related_articles" THEN 3
         WHEN "High-importance_Philippine-related_articles" THEN 4
         WHEN "Top-importance_Philippine-related_articles" THEN 5
         END) AS `importance`
FROM `page` p1
JOIN `categorylinks` c1 ON p1.`page_id` = c1.`cl_from`
JOIN `revision` ON `page_latest` = `rev_id`
JOIN `actor` ON `rev_actor` = `actor_id`
JOIN (
    SELECT
        `page_title` AS `t_page_title`,
        c2.`cl_to` AS `t_importance`
    FROM `categorylinks` c2
             JOIN `page` p2 ON p2.`page_id` = c2.`cl_from`
    WHERE
        p2.`page_namespace` = 1 AND
        (
            c2.`cl_to` = "Top-importance_Philippine-related_articles" OR
            c2.`cl_to` = "High-importance_Philippine-related_articles" OR
            c2.`cl_to` = "Mid-importance_Philippine-related_articles" OR
            c2.`cl_to` = "Low-importance_Philippine-related_articles" OR
            c2.`cl_to` = "Unknown-importance_Philippine-related_articles"
        )
) a ON `t_page_title` = `page_title`
WHERE
    c1.`cl_to` = "All_articles_lacking_sources"
ORDER BY `importance` DESC, `s_last_edit` DESC
