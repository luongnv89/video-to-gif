# API Reference

## CLI Options

### `video2gif <input> [options]`

Convert a video file to a timelapse GIF.

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `input` | Yes | Path to the input video file (MP4 or MOV) |

### Options

#### `-o, --output-dir <path>`

Specify the output directory where the GIF will be saved.

- **Default**: Same directory as the input video
- **Example**: `video2gif video.mp4 -o ./gifs`

#### `-n, --name <filename>`

Custom filename for the output GIF (without `.gif` extension).

- **Default**: Same base name as the input video
- **Example**: `video2gif video.mp4 -n my-animation`

#### `-s, --start <time>`

Start sampling from this timestamp in the video. The GIF will show progression from this point to the end of the video.

- **Default**: `0` (start of video)
- **Formats**:
  - Seconds: `30`
  - Minutes:Seconds: `1:30`
  - Hours:Minutes:Seconds: `0:01:30`
- **Example**: `video2gif video.mp4 -s 1:30`

#### `-d, --duration <seconds>`

How long the output GIF will play. The entire video (from `--start` to end) is compressed into this duration.

- **Default**: `5`
- **Maximum**: `5` (will be capped if higher)
- **Example**: `video2gif video.mp4 -d 3`

#### `-r, --fps <number>`

Number of frames per second in the output GIF.

- **Default**: `10`
- **Range**: 1-60
- **Effect**: Higher FPS = more frames sampled from video = smoother but larger file
- **Example**: `video2gif video.mp4 -r 15`

#### `-w, --width <pixels>`

Output width in pixels. Height is automatically calculated to maintain aspect ratio.

- **Default**: Original video width
- **Example**: `video2gif video.mp4 -w 480`

#### `-q, --quality <level>`

Quality preset affecting compression and color palette.

- **Default**: `high`
- **Options**:
  - `low`: Fastest, smallest file, may have color banding
  - `medium`: Balanced quality and file size
  - `high`: Best quality, larger file, uses advanced dithering
- **Example**: `video2gif video.mp4 -q medium`

#### `-y, --overwrite`

Replace existing output file without prompting.

- **Default**: `false` (will error if file exists)
- **Example**: `video2gif video.mp4 -y`

#### `-V, --version`

Display the version number.

#### `-h, --help`

Display help information.

## Exit Codes

| Code | Description |
|------|-------------|
| `0` | Success |
| `1` | Error (invalid input, FFmpeg not found, conversion failed, etc.) |

## Error Handling

The CLI provides descriptive error messages for common issues:

- **FFmpeg not installed**: Prompts user to install FFmpeg
- **Input file not found**: Shows the expected path
- **Unsupported format**: Lists supported formats (.mp4, .mov)
- **Invalid options**: Explains the valid range or values
- **Start time beyond duration**: Shows video duration
- **Output file exists**: Suggests using `--overwrite`

## Environment

### Requirements

- Node.js >= 18.0.0
- FFmpeg installed and available in PATH

### Supported Formats

- `.mp4` (MPEG-4)
- `.mov` (QuickTime)
