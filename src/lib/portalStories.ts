export interface StorySlide { media_path: string | null; media_type: 'image' | 'video' | null; caption: string }
export interface PortalStory {
 id: string; title: string; body: string; starts_at: string; expires_at: string;
 media_path: string | null; media_type: 'image' | 'video' | null; slides?: StorySlide[];
}
export function storySlides(story: PortalStory): StorySlide[] {
 return story.slides?.length ? story.slides : [{media_path:story.media_path,media_type:story.media_type,caption:story.body}]
}
export function nextStoryPosition(stories: PortalStory[], post: number, slide: number, direction: 1 | -1) {
 if(direction===1){
  if(slide+1<storySlides(stories[post]).length)return {post,slide:slide+1};
  if(post+1<stories.length)return {post:post+1,slide:0};
 }else{
  if(slide>0)return {post,slide:slide-1};
  if(post>0)return {post:post-1,slide:storySlides(stories[post-1]).length-1};
 }
 return null;
}
