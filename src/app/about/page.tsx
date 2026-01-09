
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div 
      className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 md:p-8"
      style={{ textShadow: 'none', color: 'white' }}
    >
      <Card className="w-full max-w-4xl glass-panel" style={{ color: 'hsl(var(--card-foreground))' }}>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">The Philosophy: Reactive AI</CardTitle>
          <CardDescription className="text-center text-lg text-foreground/80 pt-2">
            Beyond Autonomous. Beyond Passive. Into the Now.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 text-base text-foreground/90">
          <div>
            <h3 className="font-semibold text-xl text-primary mb-2">The Problem with "Waiting"</h3>
            <p>
              Most AI today is a tool that waits. You give it a prompt, it processes, and it replies. There is a perceptible lag—a cognitive gap between human intent and machine response. In human-to-human interaction, there is no loading spinner. Real life happens in real-time. ANTIGRAVITY-ZERO was built to close that gap.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-xl text-primary mb-2">The Innovation: The Reactive Feedback Loop</h3>
            <p>
              This is not just a game; it's a demonstration of a new paradigm: <strong>Reactive AI</strong>. We use nothing but a raw video feed to create a continuous neural stream, forcing the AI to exist in the same temporal flow as the user. It's a system designed to achieve a "Bio-Sync," reacting to your physical movements in under 100 milliseconds.
            </p>
            <ul className="list-disc list-inside mt-2 pl-4 space-y-1">
              <li><strong>Temporal Synchronization:</strong> The AI doesn't just see a static image. It tracks the motion vector of your hands to understand your rhythm and timing.</li>
              <li><strong>Predictive Motion Modeling:</strong> Instead of reacting to what happened, the AI learns to react to what is happening, anticipating your actions based on velocity and trajectory.</li>
              <li><strong>Zero-Latency Edge Processing:</strong> To be truly "reactive," there's no time for a round-trip to the cloud. All inference happens locally on your device, fighting for every millisecond.</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-xl text-primary mb-2">Why It Matters</h3>
            <p>
              If an AI can achieve this "Bio-Sync" in a simple sparring game, it can revolutionize our interaction with technology. The same core principles can be applied to:
            </p>
             <ul className="list-disc list-inside mt-2 pl-4 space-y-1">
                <li>High-speed human-robot collaboration in manufacturing.</li>
                <li>Live AR sports coaching that corrects form as it happens.</li>
                <li>Next-generation user interfaces that move from "click-and-wait" to "gesture-and-flow."</li>
            </ul>
            <p className="mt-4">
              You are experiencing the first step. Thank you for being a part of this experiment in co-processing between human and machine.
            </p>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
