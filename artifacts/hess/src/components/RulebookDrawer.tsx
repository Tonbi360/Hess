import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen } from "lucide-react";

export function RulebookDrawer() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="font-serif tracking-wider">
          <BookOpen className="mr-2 h-4 w-4" />
          Rules of Hess
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md border-l-border bg-card">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl text-primary mb-4">The Rulebook</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
            
            <section>
              <h3 className="text-lg font-serif text-foreground mb-2">Victory Conditions</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-foreground">King Capture:</strong> Capture the opponent's King.</li>
                <li><strong className="text-foreground">Desperation Stale:</strong> The King is attacked, the player has 0 swaps left, and no piece can block or capture the attacker.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-serif text-foreground mb-2">The Pieces</h3>
              
              <div>
                <strong className="text-foreground text-base block mb-1">King</strong>
                <p>Walks 1 square in any direction. Has 3 <strong className="text-primary">King Swaps</strong> per game: can swap places with any friendly Pawn instantly, but cannot swap into an attacked square.</p>
              </div>

              <div>
                <strong className="text-foreground text-base block mb-1">Queen</strong>
                <p>Standard Queen movement, but locked to her half of the board. She cannot cross the midfield line.</p>
              </div>

              <div>
                <strong className="text-foreground text-base block mb-1">Rook (Missile)</strong>
                <p>Instantly jumps exactly 4 or 6 squares vertically or horizontally. Ignores blocking pieces along the way.</p>
              </div>

              <div>
                <strong className="text-foreground text-base block mb-1">Bishop (Staircase)</strong>
                <p>Moves in alternating vertical and horizontal steps. Can be blocked by pieces along the staircase path.</p>
              </div>

              <div>
                <strong className="text-foreground text-base block mb-1">Knight (T-Shape)</strong>
                <p>Moves 2 squares in any direction + 1 sideways. The 2-square step cannot go backward toward its own side.</p>
              </div>

              <div>
                <strong className="text-foreground text-base block mb-1">Pawn</strong>
                <p>Normal chess movement. Promotes to a <strong className="text-primary">Jester</strong> upon reaching the last rank.</p>
              </div>

              <div>
                <strong className="text-foreground text-base block mb-1">Jester</strong>
                <p>Moves diagonally forward only. Cannot be directly captured: the attacker bounces back, and the Jester's owner must sacrifice another friendly piece to save it.</p>
              </div>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
