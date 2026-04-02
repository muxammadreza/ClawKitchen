# Media Generation Workflows

## Overview

ClawKitchen provides integrated media generation capabilities through workflow nodes that can create images, videos, and audio content. This system uses skill auto-discovery to work with various media generation providers while maintaining a consistent workflow interface.

## Media Node Types

### media-image
Generates static images from text prompts.

**Common Use Cases:**
- Marketing visuals and hero images
- Social media graphics
- Product illustrations
- Blog post featured images
- Presentation slides

**Configuration:**
- **Agent Assignment**: Team member who executes the generation
- **Image Prompt**: Text description of desired image
- **Media Type**: Set to "image" (auto-configured)
- **Provider**: Auto-discovered from available skills

### media-video
Creates video content from text descriptions.

**Common Use Cases:**
- Product demo videos
- Marketing commercials
- Educational content
- Social media video posts
- Explainer animations

**Configuration:**
- **Agent Assignment**: Team member who executes the generation
- **Video Prompt**: Description of desired video content
- **Media Type**: Set to "video" (auto-configured)
- **Provider**: Auto-discovered from available skills

### media-audio
Generates audio content including voiceovers and music.

**Common Use Cases:**
- Podcast content
- Voiceovers for videos
- Background music
- Audio advertisements
- Training narrations

**Configuration:**
- **Agent Assignment**: Team member who executes the generation
- **Audio Prompt**: Description of desired audio content
- **Media Type**: Set to "audio" (auto-configured)
- **Provider**: Auto-discovered from available skills

## Skill Auto-Discovery System

ClawKitchen automatically detects available media generation capabilities by scanning:

1. **OpenClaw Skills Directory**: `~/.openclaw/skills/`
2. **Workspace Skills**: Team-specific skills in workspace
3. **Supported Providers**: CellCog, OpenAI, and custom skills

### How Auto-Discovery Works
- **Skill Scanning**: System scans for generation scripts in skill directories
- **Capability Detection**: Identifies image, video, and audio generation scripts
- **Provider Selection**: Chooses best available provider for each media type
- **Environment Setup**: Configures API keys and settings from OpenClaw config

### Supported Providers

#### CellCog Integration
- **Multi-modal AI**: Support for images, videos, and audio
- **High Quality**: Production-ready media generation
- **Coordination**: Multi-agent orchestration for complex content

#### OpenAI Integration
- **DALL-E**: Image generation via OpenAI API
- **Whisper**: Audio processing and generation
- **API Integration**: Direct OpenAI service integration

#### Custom Skills
- **Extensible**: Add custom generation providers via skill system
- **Flexible**: Support for specialized or proprietary generation tools
- **Configurable**: Custom parameters and settings per provider

## Workflow Integration Patterns

### Sequential Generation
Create multiple related media assets in sequence:

```
Draft Content (LLM) → Generate Image → Generate Video → Approval → Publish
```

**Example Use Case**: Blog post with featured image and promotional video

### Parallel Generation  
Generate multiple media types simultaneously:

```
                  → Generate Hero Image
Draft Content →   → Generate Social Video  → Combine Assets → Approval  
                  → Generate Audio Clip
```

**Example Use Case**: Multi-platform marketing campaign

### Conditional Generation
Generate media based on content analysis:

```
Analyze Content → Route by Type → Generate Appropriate Media → Review → Publish
```

**Example Use Case**: Automatic media selection based on content category

### Iterative Refinement
Generate, review, and refine media through multiple cycles:

```
Initial Generation → Human Review → Refine Prompt → Re-generate → Final Approval
```

**Example Use Case**: High-stakes marketing visuals requiring multiple revisions

## Prompt Engineering for Media

### Image Prompts
Effective image prompts include:

**Visual Style**
- Art style: "photorealistic", "minimalist", "hand-drawn"
- Color scheme: "vibrant colors", "monochromatic", "sunset palette"
- Composition: "centered subject", "rule of thirds", "close-up portrait"

**Subject Matter**
- Main subject: "professional businesswoman", "modern laptop", "city skyline"
- Context: "in office setting", "on wooden desk", "during golden hour"
- Mood: "confident and approachable", "sleek and modern", "warm and inviting"

**Technical Details**
- Resolution: "high resolution", "4K quality", "print ready"
- Format: "landscape orientation", "square format", "vertical social media"
- Lighting: "soft natural lighting", "dramatic shadows", "bright and airy"

**Example Effective Prompt:**
```
"A modern, clean illustration of a workflow automation dashboard displayed on a sleek laptop screen. The dashboard shows colorful workflow nodes connected by flowing lines. The setting is a bright, contemporary office with soft natural lighting. Style: minimalist vector art with a technology color palette of blues and greens. High resolution, landscape orientation."
```

### Video Prompts  
Effective video prompts specify:

**Content Structure**
- Duration: "30-second video", "brief 10-second clip", "2-minute explanation"
- Pacing: "fast-paced montage", "slow and contemplative", "energetic presentation"
- Narrative: "product demonstration", "customer testimonial", "feature walkthrough"

**Visual Elements**
- Camera work: "smooth camera movements", "close-up shots", "wide establishing shots"
- Transitions: "smooth fade transitions", "quick cuts", "seamless scene changes"
- Text overlay: "minimal text labels", "animated titles", "call-to-action buttons"

**Audio Elements**
- Background music: "upbeat electronic music", "subtle ambient sounds", "no background music"
- Voiceover: "professional female narrator", "energetic male voice", "conversational tone"
- Sound effects: "subtle interface sounds", "ambient office noise", "minimal sound design"

**Example Effective Prompt:**
```
"A 30-second product demo video showing a user creating a workflow in ClawKitchen. Start with a close-up of hands typing, then zoom out to show the visual editor interface. Highlight drag-and-drop functionality with smooth animations. End with the completed workflow running successfully. Style: clean and professional with subtle motion graphics. Include upbeat background music and minimal text overlays showing key features."
```

### Audio Prompts
Effective audio prompts include:

**Voice Characteristics**
- Gender and age: "professional female voice, mid-30s", "authoritative male narrator"  
- Tone: "warm and friendly", "confident and professional", "casual and conversational"
- Accent: "neutral American accent", "slight British accent", "international English"

**Content Style**
- Pace: "moderate speaking pace", "slightly faster for energy", "slow and deliberate"
- Emphasis: "emphasize key benefits", "casual conversational style", "educational tone"
- Structure: "introduction, main points, call-to-action", "storytelling format"

**Technical Specifications**
- Quality: "studio quality recording", "podcast-ready audio", "broadcast standard"
- Format: "mono voice track", "stereo with ambient sound", "voice-only no effects"
- Length: "2-minute narration", "30-second voiceover", "brief 15-second intro"

**Example Effective Prompt:**
```
"A 90-second professional voiceover explaining the benefits of workflow automation for small businesses. The narrator should be a confident, approachable female voice with a warm tone. The script should cover time savings, reduced errors, and improved team coordination. Pace should be moderate with natural pauses. Studio quality recording with no background music or effects."
```

## Template Variables in Media Nodes

Use template variables to create dynamic media prompts:

### From Upstream Nodes
```json
{
  "id": "generate_post_image",
  "kind": "media-image",
  "input": { "from": ["draft_content"] },
  "action": {
    "image_prompt": "Create a featured image for this blog post: {{draft_content.title}}. Style should match this theme: {{draft_content.category}}",
    "mediaType": "image"
  }
}
```

### Workflow Variables
```json
{
  "id": "generate_branded_video", 
  "kind": "media-video",
  "action": {
    "video_prompt": "Create a {{workflow.brand_style}} video for {{workflow.campaign_name}} featuring {{workflow.target_audience}}",
    "mediaType": "video"
  }
}
```

### Dynamic Content
```json
{
  "id": "personalized_audio",
  "kind": "media-audio", 
  "action": {
    "audio_prompt": "Record a personalized greeting for {{customer.name}} about {{product.name}} with a {{customer.preferred_tone}} tone",
    "mediaType": "audio"
  }
}
```

## Managing Generated Assets

### File Organization
Generated media assets are organized in the workflow run directory:
```
shared-context/workflow-runs/{runId}/
├── run.json
├── node-outputs/
│   ├── 001-generate_image.json
│   └── 002-generate_video.json
└── artifacts/
    ├── hero_image_final.png
    ├── promo_video_v1.mp4
    └── voiceover_final.mp3
```

### Asset Metadata
Each generated asset includes metadata:
- **Original Prompt**: Text prompt used for generation
- **Provider Used**: Which skill/provider generated the asset
- **Generation Time**: When asset was created
- **File Information**: Size, format, dimensions/duration
- **Quality Metrics**: Provider-specific quality scores

### Asset Delivery
Generated assets can be used in subsequent workflow nodes:
- **Reference by Path**: Use file path in tool nodes
- **Template Variables**: Insert asset URLs in content
- **Approval Workflows**: Include assets in approval requests
- **Publishing**: Automatically attach to social media posts

## Troubleshooting Media Generation

### Common Issues

**No Media Providers Available**
- Check if media generation skills are installed
- Verify OpenClaw skill directory contains generation scripts
- Confirm API keys are configured in OpenClaw config
- Review skill compatibility with current OpenClaw version

**Generation Timeouts**
- Increase node timeout settings for complex media
- Check provider service status and rate limits
- Verify network connectivity to generation services
- Consider breaking complex prompts into simpler requests

**Poor Quality Output**
- Refine prompts with more specific descriptions
- Add technical specifications (resolution, format)
- Include style and mood descriptors
- Test prompts with different providers

**Large File Sizes**
- Specify output format and compression in prompts
- Configure provider-specific quality settings
- Consider file size limits for downstream usage
- Implement post-processing compression if needed

### Debugging Media Workflows

1. **Check Provider Availability**: Verify generation skills are detected
2. **Review Prompt Quality**: Test prompts manually with providers
3. **Monitor Resource Usage**: Watch for memory/disk constraints
4. **Validate Configurations**: Ensure API keys and settings are correct
5. **Test Incrementally**: Start with simple prompts and build complexity

### Optimization Tips

**Performance**
- Use appropriate resolution/quality for intended use
- Cache frequently used prompts and results
- Implement parallel generation for multiple assets
- Consider provider-specific optimization settings

**Cost Management**
- Monitor API usage and costs across providers
- Implement prompt reuse for similar content
- Use lower-cost providers for draft/preview content
- Set up alerts for unusual usage patterns

**Quality Assurance**
- Implement human review steps for critical assets
- Create prompt templates for consistent brand style
- Establish quality guidelines and approval criteria
- Maintain asset libraries for reuse and reference

## Integration with Publishing Workflows

### Social Media Publishing
```
Generate Content → Create Image → Create Video → Schedule Posts → Monitor Performance
```

### Blog Publishing
```  
Write Article → Generate Featured Image → Create Social Assets → Publish → Share
```

### Marketing Campaigns
```
Campaign Brief → Generate Assets → A/B Test Variants → Select Winners → Launch Campaign
```

### Product Documentation
```
Feature Description → Generate Screenshots → Create Demo Video → Update Docs → Release
```

Media generation workflows enable teams to create comprehensive, multi-format content automatically while maintaining quality and brand consistency.