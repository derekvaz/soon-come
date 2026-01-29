export default function Footer() {
  return (
    <footer className="bg-black px-4 pt-5 pb-6 mt-auto">
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-6">
          <a href="#" className="text-[10px] font-black text-white uppercase tracking-[2.1px]">
            Terms
          </a>
          <a href="#" className="text-[10px] font-black text-white uppercase tracking-[2.1px]">
            Privacy
          </a>
          <a href="#" className="text-[10px] font-black text-white uppercase tracking-[2.1px]">
            Accessibility
          </a>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-white uppercase tracking-[2.1px]">
            GTFS REALTIME ACTIVATED
          </span>
          <span className="w-2 h-2 rounded-full bg-live-green" />
        </div>
      </div>
    </footer>
  );
}
