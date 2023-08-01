<?php
function clean_string($str) {
    return str_replace("\n", '', trim($str));
}

$dirs = wp_upload_dir();
$basedir = $dirs['basedir'];

$items = json_decode(file_get_contents($basedir . '/results.json'));

$count = 408;

foreach ($items as $item) {
    $payload = [
        'post_title' => $item->title,
        'post_name' => $count,  // 自己參照網站文章 ID 設定
        'post_content' => $item->transcripts, // 文章內容
        'post_excerpt' => $item->excerpt,
        'post_status' => 'publish',
        'meta_input' => [
            'youtube_video_name' => $item->title,
            'youtube_channel_name' => $item->name,
            'youtube_video_url' => $item->video_url,
            'youtube_video_meta' => $item->meta,
            'youtube_video_published_date' => $item->published_date,
            'youtube_video_genre' => $item->genre,
            'youtube_video_description' => clean_string($item->description),
        ]
    ];
    $post = wp_insert_post($payload);
    $count++;
    
    $category_main = get_term_by('name', $item->genre, 'category'); 
    
    if (!$category_main) {
        $category_main = wp_insert_term($item->genre, 'category');
    }
    
    wp_set_object_terms( $post, $category_main->term_id, 'category', true );
    
    $term = get_term_by('name', $item->name, 'post_tag');
    if (!$term) {
        $term = wp_insert_term($item->name, 'post_tag');
    }
    wp_set_object_terms( $post, $term->term_id, 'post_tag', true );
};
?>