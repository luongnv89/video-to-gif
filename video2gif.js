#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const ffmpeg = require('fluent-ffmpeg');
const cliProgress = require('cli-progress');

// Supported video formats
const SUPPORTED_FORMATS = ['.mp4', '.mov'];

// Quality presets for GIF generation
const QUALITY_PRESETS = {
  low: { scale: 'lanczos', dither: 'none' },
  medium: { scale: 'lanczos', dither: 'bayer:bayer_scale=3' },
  high: { scale: 'lanczos', dither: 'sierra2_4a' },
};

/**
 * Parse time string to seconds
 * Accepts formats: "SS", "MM:SS", "HH:MM:SS", or seconds as number
 */
function parseTime(timeStr) {
  if (typeof timeStr === 'number') {
    if (timeStr < 0) throw new Error('Time cannot be negative');
    return timeStr;
  }

  if (!timeStr || typeof timeStr !== 'string') {
    throw new Error(`Invalid time format: ${timeStr}`);
  }

  const parts = timeStr.split(':').map(Number);
  if (parts.some(isNaN) || parts.some(n => n < 0)) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];

  throw new Error(`Invalid time format: ${timeStr}`);
}

/**
 * Safely parse fraction string (e.g., "30000/1001" or "30")
 */
function parseFraction(fractionStr) {
  if (!fractionStr) return null;
  const parts = String(fractionStr).split('/');
  if (parts.length === 2) {
    const numerator = parseFloat(parts[0]);
    const denominator = parseFloat(parts[1]);
    if (denominator !== 0 && !isNaN(numerator) && !isNaN(denominator)) {
      return numerator / denominator;
    }
  }
  const parsed = parseFloat(fractionStr);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Get video metadata (duration, dimensions)
 */
function getVideoMetadata(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to read video metadata: ${err.message}`));
        return;
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      if (!videoStream) {
        reject(new Error('No video stream found in file'));
        return;
      }

      resolve({
        duration: metadata.format.duration,
        width: videoStream.width,
        height: videoStream.height,
        fps: parseFraction(videoStream.r_frame_rate) || 30,
      });
    });
  });
}

/**
 * Convert video to GIF using timelapse mode - samples frames evenly across the entire video
 * to create a "rewind" effect showing the video's progression from start to end
 */
async function convertToGif(inputPath, outputPath, options) {
  const { start, duration, fps, width, quality, overwrite } = options;

  // Check if output exists
  if (fs.existsSync(outputPath) && !overwrite) {
    throw new Error(`Output file already exists: ${outputPath}\nUse --overwrite to replace it.`);
  }

  // Get video metadata
  const metadata = await getVideoMetadata(inputPath);

  // Calculate the video range to sample from
  const startSeconds = parseTime(start);
  const gifDuration = Math.min(duration, 5); // Cap GIF duration at 5 seconds
  const videoRangeEnd = metadata.duration;
  const videoRangeStart = startSeconds;
  const videoRangeDuration = videoRangeEnd - videoRangeStart;

  if (videoRangeDuration <= 0) {
    throw new Error(`Start time (${start}) is beyond video duration (${metadata.duration.toFixed(2)}s)`);
  }

  // Calculate how many frames we need for the output GIF
  const totalFramesNeeded = Math.ceil(gifDuration * fps);

  // Calculate the interval between sampled frames in the source video
  // This determines how much video time passes between each GIF frame
  const sampleInterval = videoRangeDuration / totalFramesNeeded;

  // Calculate scale filter
  let scaleFilter = '';
  if (width) {
    scaleFilter = `scale=${width}:-1:flags=${QUALITY_PRESETS[quality].scale}`;
  } else {
    scaleFilter = `scale=${metadata.width}:-1:flags=${QUALITY_PRESETS[quality].scale}`;
  }

  // Create progress bar
  const progressBar = new cliProgress.SingleBar({
    format: 'Converting |{bar}| {percentage}% | ETA: {eta}s',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  });

  console.log(`\nInput: ${inputPath}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Mode: Timelapse (sampling ${videoRangeDuration.toFixed(2)}s video into ${gifDuration.toFixed(2)}s GIF)`);
  console.log(`Sampling: ~${totalFramesNeeded} frames from ${videoRangeStart}s to ${videoRangeEnd.toFixed(2)}s`);
  console.log(`Frame rate: ${fps} FPS`);
  console.log(`Quality: ${quality}\n`);

  progressBar.start(100, 0);

  return new Promise((resolve, reject) => {
    // Build filter complex for timelapse GIF generation
    // 1. select: Pick frames at regular intervals across the video range
    //    - 'gte(t,{start})' ensures we start from the specified start time
    //    - 'floor((t-{start})/{interval})' groups frames into intervals
    //    - 'prev_selected_t' prevents selecting multiple frames from same interval
    // 2. setpts: Reset timestamps so the output plays at normal speed
    // 3. scale: Resize if needed
    // 4. palettegen/paletteuse: High-quality GIF color palette

    // Select frames evenly across the video range:
    // - gte(t, start): frame time >= start time
    // - lte(t, end): frame time <= end time
    // - isnan(prev_selected_t)+gte(...): select first frame OR frames at intervals
    const selectExpr = `select='gte(t\\,${videoRangeStart})*lte(t\\,${videoRangeEnd})*(isnan(prev_selected_t)+gte(t-prev_selected_t\\,${sampleInterval}))'`;
    const ptsExpr = `setpts=N/${fps}/TB`;

    const filterComplex = `${selectExpr},${ptsExpr},${scaleFilter},split[s0][s1];[s0]palettegen=stats_mode=full[p];[s1][p]paletteuse=dither=${QUALITY_PRESETS[quality].dither}`;

    const command = ffmpeg(inputPath)
      .complexFilter(filterComplex)
      .outputOptions(['-vsync', 'vfr'])
      .output(outputPath)
      .format('gif');

    if (overwrite) {
      command.outputOptions('-y');
    }

    command
      .on('progress', (progress) => {
        if (progress.percent) {
          progressBar.update(Math.min(100, Math.round(progress.percent)));
        }
      })
      .on('end', () => {
        progressBar.update(100);
        progressBar.stop();

        const stats = fs.statSync(outputPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`\n✓ Timelapse GIF created successfully! (${sizeMB} MB)`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        progressBar.stop();
        reject(new Error(`Conversion failed: ${err.message}`));
      })
      .run();
  });
}

/**
 * Check if FFmpeg is available
 */
function checkFfmpeg() {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err) => {
      resolve(!err);
    });
  });
}

// CLI Configuration
program
  .name('video2gif')
  .description('Convert MP4 or MOV videos to timelapse GIFs showing the entire video progression')
  .version('1.0.0')
  .argument('<input>', 'Input video file (MP4 or MOV)')
  .option('-o, --output-dir <path>', 'Output directory (default: same as input)')
  .option('-n, --name <filename>', 'Output filename without extension (default: same as input)')
  .option('-s, --start <time>', 'Start sampling from this timestamp (formats: SS, MM:SS, HH:MM:SS)', '0')
  .option('-d, --duration <seconds>', 'Output GIF duration in seconds (max 5)', '5')
  .option('-r, --fps <number>', 'Frame rate (frames per second)', '10')
  .option('-w, --width <pixels>', 'Output width in pixels (height auto-calculated)')
  .option('-q, --quality <level>', 'Quality preset: low, medium, high', 'high')
  .option('-y, --overwrite', 'Overwrite output file if it exists', false)
  .addHelpText('after', `
How It Works:
  This tool creates a TIMELAPSE GIF that shows the entire video's progression
  from start to end, compressed into a short GIF (max 5 seconds).

  Example: A 60-second video converted with default settings (5s, 10 FPS):
  - Total frames in GIF: 50 frames
  - Samples 1 frame every 1.2 seconds from the video
  - Result: 5-second GIF showing the full video as a fast-forward/rewind

Examples:
  $ node video2gif.js video.mp4
    Creates a 5-second timelapse GIF of the entire video

  $ node video2gif.js video.mp4 -d 3 -r 15 -w 480 -q high
    Creates a 3-second GIF at 15 FPS, 480px wide, high quality

  $ node video2gif.js video.mp4 -s 30
    Creates timelapse starting from 30 seconds to the end of the video

  $ node video2gif.js input.mov -o ./gifs -n my-timelapse -y
    Creates ./gifs/my-timelapse.gif, overwriting if exists

Parameter Details:
  --output-dir    Directory where GIF will be saved
                  Default: Same directory as input video

  --name          Custom filename for the output GIF (without .gif extension)
                  Default: Same base name as input video

  --start         Start sampling from this timestamp in the video
                  The GIF will show progression from this point to the end
                  Formats: 30 (seconds), 1:30 (min:sec), 0:01:30 (hr:min:sec)
                  Default: 0 (start of video)

  --duration      How long the output GIF will play
                  The entire video (from --start to end) is compressed into this duration
                  Maximum: 5 seconds (will be capped if higher)
                  Default: 5 seconds

  --fps           Number of frames per second in the output GIF
                  Higher FPS = more frames sampled from video = smoother but larger file
                  Lower FPS = fewer samples = choppier but smaller file
                  Default: 10 FPS

  --width         Output width in pixels; height is calculated to maintain aspect ratio
                  Default: Original video width

  --quality       Compression and color palette quality
                  low: Fastest, smallest file, may have banding
                  medium: Balanced quality and file size
                  high: Best quality, larger file, uses advanced dithering
                  Default: high

  --overwrite     Replace existing output file without prompting
                  Default: false (will error if file exists)
`);

// Main execution
async function main() {
  program.parse();

  const inputPath = program.args[0];
  const options = program.opts();

  // Validate FFmpeg availability
  const ffmpegAvailable = await checkFfmpeg();
  if (!ffmpegAvailable) {
    console.error('Error: FFmpeg is not installed or not found in PATH.');
    console.error('Please install FFmpeg: https://ffmpeg.org/download.html');
    process.exit(1);
  }

  // Validate input file
  if (!inputPath) {
    console.error('Error: Input video file is required.');
    program.help();
    process.exit(1);
  }

  const absoluteInputPath = path.resolve(inputPath);

  if (!fs.existsSync(absoluteInputPath)) {
    console.error(`Error: Input file not found: ${absoluteInputPath}`);
    process.exit(1);
  }

  const ext = path.extname(absoluteInputPath).toLowerCase();
  if (!SUPPORTED_FORMATS.includes(ext)) {
    console.error(`Error: Unsupported format "${ext}". Supported: ${SUPPORTED_FORMATS.join(', ')}`);
    process.exit(1);
  }

  // Validate quality option
  if (!QUALITY_PRESETS[options.quality]) {
    console.error(`Error: Invalid quality "${options.quality}". Use: low, medium, high`);
    process.exit(1);
  }

  // Validate numeric options
  const duration = parseFloat(options.duration);
  const fps = parseInt(options.fps, 10);
  const width = options.width ? parseInt(options.width, 10) : null;

  if (isNaN(duration) || duration <= 0) {
    console.error('Error: Duration must be a positive number');
    process.exit(1);
  }

  if (isNaN(fps) || fps <= 0 || fps > 60) {
    console.error('Error: FPS must be between 1 and 60');
    process.exit(1);
  }

  if (width !== null && (isNaN(width) || width <= 0)) {
    console.error('Error: Width must be a positive number');
    process.exit(1);
  }

  // Build output path
  const inputDir = path.dirname(absoluteInputPath);
  const inputBasename = path.basename(absoluteInputPath, ext);

  const outputDir = options.outputDir ? path.resolve(options.outputDir) : inputDir;
  const outputName = options.name || inputBasename;
  const outputPath = path.join(outputDir, `${outputName}.gif`);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    await convertToGif(absoluteInputPath, outputPath, {
      start: options.start,
      duration,
      fps,
      width,
      quality: options.quality,
      overwrite: options.overwrite,
    });
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
}

main();
