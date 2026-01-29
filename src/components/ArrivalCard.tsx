interface Departure {
  minutes: number;
  type: "live" | "estimate";
}

interface ArrivalCardProps {
  stopName: string;
  direction: string;
  soonCome: boolean;
  departures: Departure[];
}

export default function ArrivalCard({ stopName, direction, soonCome, departures }: ArrivalCardProps) {
  return (
    <section className="border-b-[3.7px] border-black px-6 pt-10 pb-20">
      <div className="flex flex-col gap-8">
        {/* Stop header */}
        <div className="flex items-center gap-3">
          <span className="w-[7px] h-3 rounded-full bg-red shrink-0" />
          <div className="flex flex-col gap-2">
            <h3 className="text-[20px] font-black uppercase tracking-[-0.35px]">
              {stopName}
            </h3>
            <p className="text-[16px] font-bold text-muted uppercase tracking-[-0.53px]">
              {direction}
            </p>
          </div>
        </div>

        {/* Soon come status + departures */}
        <div className="flex flex-col gap-6">
          <p
            className={`text-[96px] font-black leading-none uppercase tracking-[-5px] ${
              soonCome ? "text-green" : "text-red"
            }`}
          >
            {soonCome ? "Yes" : "No"}
          </p>

          <div>
            <p className="text-[12px] font-black text-muted uppercase tracking-[2.4px] mb-4">
              Next Departures
            </p>
            <div className="flex flex-col gap-4">
              {departures.map((dep, i) => (
                <div key={i} className="flex items-center justify-between h-12">
                  <span className="text-[48px] font-black leading-[48px] tracking-[-1.57px]">
                    {dep.minutes}
                  </span>
                  <div className="text-right">
                    <p className="text-[18px] font-black uppercase tracking-[-0.44px]">
                      Mins
                    </p>
                    <p
                      className={`text-[10px] font-bold uppercase tracking-[0.12px] ${
                        dep.type === "live" ? "text-green" : "text-muted"
                      }`}
                    >
                      {dep.type === "live" ? "LIVE" : "Estimate"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
