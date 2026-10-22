# Caine's Wonder Workshop

A browser-based 3D playground inspired by the surreal, cheerful chaos of *The Amazing Digital Circus*. The current character is a fan-made, Caine-inspired ringmaster model built from Three.js geometry.

## Current features

- A 3D stage and orbitable camera (drag to rotate, scroll to zoom).
- A floating ringmaster character with animated expression, hat, outfit, cane, and performance gestures.
- Create 3D objects from short descriptions, or use the shape picker.
- A coding desk with a small, safe command language that builds and moves objects in the world.
- Basic character dialogue, simple reactions, and session memories.

## Coding desk language

Each line is one command. Use quoted strings and numbers, and start comments with `#`.

```text
box("stage", 0, 0.5, 0, 5, "#533b85")
sphere("moon", 2, 3, -1, 1, "#ffe98a")
torus("portal", -2, 1.6, 0, 1, "#55e8ff")
star("sparkle", 0, 3.5, 1, 0.7, "#ff4d9d")
spin("portal", 0.8)
move("moon", 3, 3, -1)
delete("sparkle")
say("Ta-da!")
```

Available object commands: `box`, `sphere`, `cone`, `torus`, `cylinder`, `star`, `tree`, `mushroom`. Utility commands: `spin`, `move`, `delete`, `clear`, `say`.

The coding desk intentionally runs only this limited object-building language, not arbitrary JavaScript. That makes it easier to experiment with 3D creations without executing unrestricted code.

## Run locally

Requires Node.js 20+.

1. Set `GROQ_API_KEY` in your environment if you intend to run the server-side Groq endpoint.
2. Run `npm start`.
3. Open `http://localhost:3000`.

## Next planned stage: AI and teaching

The current browser character uses scripted dialogue and a limited set of actions. The AI endpoint is on the server, but the character UI is **not connected to it yet**. Next, connect Caine to the server-side model, add a teaching/memory system, and let the model request object-building actions through validated commands. Keep API keys in the server environment; never put them in `public/index.html` or commit them to GitHub.

An LLM can produce flexible dialogue and plans, but that alone does not make a program conscious or sentient.