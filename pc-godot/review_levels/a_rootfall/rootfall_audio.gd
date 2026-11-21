extends Node
## Rootfall review level: procedural event audio.
##
## Why: the review level needs distinct sounds for each combat beat without
## adding audio files. Every cue is synthesized once at startup from sine,
## sweep and seeded noise layers, then mixed into one AudioStreamGenerator.
## Rendering is pure and seeded, so tests can check cues without a sound card.

const MIX_RATE := 22050.0

## Cue recipes. Each layer: kind, start s, length s, freq Hz, end freq Hz, gain, decay.
const CUES := {
	"axe": [["noise", 0.0, 0.09, 0.0, 0.0, 0.55, 30.0], ["sine", 0.0, 0.22, 140.0, 70.0, 0.6, 14.0]],
	"arrow": [["sine", 0.0, 0.16, 1800.0, 900.0, 0.18, 10.0], ["noise", 0.0, 0.05, 0.0, 0.0, 0.15, 60.0]],
	"arrow_hit": [["sine", 0.0, 0.12, 420.0, 300.0, 0.4, 28.0], ["noise", 0.0, 0.04, 0.0, 0.0, 0.3, 70.0]],
	"spell": [["chime", 0.0, 0.9, 660.0, 660.0, 0.16, 3.2], ["chime", 0.05, 0.85, 990.0, 980.0, 0.09, 3.6]],
	"spell_hit": [["chime", 0.0, 0.6, 494.0, 440.0, 0.2, 4.5], ["noise", 0.0, 0.08, 0.0, 0.0, 0.08, 30.0]],
	"enemy_hit": [["sine", 0.0, 0.14, 210.0, 160.0, 0.42, 22.0], ["noise", 0.0, 0.06, 0.0, 0.0, 0.25, 45.0]],
	"root_telegraph": [["sine", 0.0, 1.3, 55.0, 75.0, 0.5, 0.6], ["noise", 0.0, 1.3, 0.0, 0.0, 0.06, 0.8]],
	"root_strike": [["noise", 0.0, 0.35, 0.0, 0.0, 0.7, 9.0], ["sine", 0.0, 0.45, 90.0, 40.0, 0.7, 6.0]],
	"member_hit": [["sine", 0.0, 0.2, 260.0, 150.0, 0.45, 12.0]],
	"shriek": [["sine", 0.0, 0.45, 1300.0, 2100.0, 0.16, 4.0], ["sine", 0.0, 0.45, 1950.0, 2600.0, 0.07, 5.0]],
	"defeated": [["sine", 0.0, 0.7, 180.0, 60.0, 0.5, 3.0], ["noise", 0.0, 0.5, 0.0, 0.0, 0.25, 5.0]],
	"drop": [["chime", 0.0, 0.5, 520.0, 520.0, 0.18, 5.0], ["chime", 0.12, 0.5, 780.0, 780.0, 0.15, 5.0]],
	"pickup": [["chime", 0.0, 0.35, 620.0, 620.0, 0.2, 7.0], ["chime", 0.1, 0.45, 930.0, 930.0, 0.18, 6.0]],
	"victory": [["chime", 0.0, 1.2, 392.0, 392.0, 0.16, 2.0], ["chime", 0.18, 1.1, 587.0, 587.0, 0.13, 2.2], ["chime", 0.36, 1.0, 784.0, 784.0, 0.11, 2.4]],
}

## Maps state events to cue names.
const EVENT_CUES := {
	"axe_swing": "axe", "arrow_loosed": "arrow", "arrow_hit": "arrow_hit",
	"spell_loosed": "spell", "spell_hit": "spell_hit", "enemy_hit": "enemy_hit",
	"root_telegraph": "root_telegraph", "root_strike": "root_strike",
	"member_hit": "member_hit", "barkwing_shriek": "shriek", "enemy_defeated": "defeated",
	"reward_dropped": "drop", "item_picked": "pickup", "victory": "victory",
}

var buffers := {}
var played: Array = []         # cue names in play order, for tests and review logs
var _voices: Array = []        # [buffer, read position, gain]
var _player: AudioStreamPlayer
var _playback: AudioStreamGeneratorPlayback


func _ready() -> void:
	for cue in CUES:
		buffers[cue] = render_cue(cue)
	# Focused headless tests verify deterministic cue buffers and event routing.
	# They do not need a live playback object, which Godot 4.7.2 retains until
	# process shutdown and reports as a false-positive ObjectDB leak.
	if DisplayServer.get_name() == "headless":
		set_process(false)
		return
	var stream := AudioStreamGenerator.new()
	stream.mix_rate = MIX_RATE
	stream.buffer_length = 0.25
	_player = AudioStreamPlayer.new()
	_player.stream = stream
	_player.volume_db = -4.0
	add_child(_player)
	_player.play()
	_playback = _player.get_stream_playback() as AudioStreamGeneratorPlayback


func _exit_tree() -> void:
	shutdown()


## Releases the generator playback before the audio node leaves the tree.
## Godot otherwise retains the playback RefCounted until process shutdown,
## which makes focused SceneTree tests report an ObjectDB leak.
func shutdown() -> void:
	set_process(false)
	_voices.clear()
	if is_instance_valid(_player):
		_player.stop()
		_player.stream = null
		_player.queue_free()
	_player = null
	_playback = null


## Renders one cue to mono samples in [-1, 1]. Pure and deterministic.
static func render_cue(cue: String) -> PackedFloat32Array:
	var layers: Array = CUES[cue]
	var length := 0.0
	for l in layers:
		length = maxf(length, l[1] + l[2])
	var out := PackedFloat32Array()
	out.resize(int(length * MIX_RATE) + 1)
	var seed := cue.hash() & 0x7fffffff
	for l in layers:
		var start := int(l[1] * MIX_RATE)
		var n := int(l[2] * MIX_RATE)
		var phase := 0.0
		for i in n:
			var t := float(i) / MIX_RATE
			var u := float(i) / float(maxi(1, n))
			var env := exp(-t * l[6]) * minf(1.0, t * 400.0) * (1.0 - u * u)
			var s := 0.0
			match l[0]:
				"noise":
					seed = (seed * 1103515245 + 12345) & 0x7fffffff
					s = float(seed) / float(0x3fffffff) - 1.0
				"sine":
					phase += TAU * lerpf(l[3], l[4], u) / MIX_RATE
					s = sin(phase)
				"chime":
					phase += TAU * lerpf(l[3], l[4], u) / MIX_RATE
					s = sin(phase) * 0.8 + sin(phase * 2.01) * 0.2
			out[start + i] += s * env * l[5]
	for i in out.size():
		out[i] = clampf(out[i], -1.0, 1.0)
	return out


func play_event(type: String) -> void:
	if EVENT_CUES.has(type):
		play(EVENT_CUES[type])


func play(cue: String, gain: float = 1.0) -> void:
	played.append(cue)
	_voices.append([buffers[cue], 0, gain])
	if _voices.size() > 12:
		_voices.pop_front()


func _process(_delta: float) -> void:
	if _playback == null:
		return
	var frames := _playback.get_frames_available()
	if frames <= 0:
		return
	var chunk := PackedVector2Array()
	chunk.resize(frames)
	for i in frames:
		var s := 0.0
		for v in _voices:
			var buf: PackedFloat32Array = v[0]
			if v[1] < buf.size():
				s += buf[v[1]] * v[2]
				v[1] += 1
		s = clampf(s, -1.0, 1.0)
		chunk[i] = Vector2(s, s)
	_voices = _voices.filter(func(v): return v[1] < v[0].size())
	_playback.push_buffer(chunk)
