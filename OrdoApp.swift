
import SwiftUI
import AVFoundation

// MARK: - App Entry
struct OrdoApp: App {
    var body: some Scene {
        WindowGroup {
            HomeView()
        }
    }
}

// MARK: - Home Screen
struct HomeView: View {
    @State private var showingScanner = false
    @State private var capturedImage: UIImage?
    
    var body: some View {
        ZStack {
            Color(hex: "#FDFCFB").ignoresSafeArea()
            
            VStack(spacing: 0) {
                Spacer()
                
                LogoView()
                    .padding(.bottom, 60)
                
                VStack(spacing: 16) {
                    Text(capturedImage == nil ? "Restore order to\nyour space." : "Order detected.")
                        .font(.system(size: 34, weight: .light, design: .serif))
                        .multilineTextAlignment(.center)
                        .foregroundColor(Color(hex: "#2A2826"))
                        .lineSpacing(4)
                    
                    if let image = capturedImage {
                        Image(uiImage: image)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 200, height: 260)
                            .clipShape(RoundedRectangle(cornerRadius: 24))
                            .shadow(color: Color.black.opacity(0.1), radius: 20, x: 0, y: 10)
                            .padding(.top, 20)
                    } else {
                        Text("Ordo uses AI to reveal the calm\nhidden within your environment.")
                            .font(.system(size: 15, weight: .light))
                            .multilineTextAlignment(.center)
                            .foregroundColor(Color.black.opacity(0.4))
                            .lineSpacing(2)
                    }
                }
                
                Spacer()
                
                Button(action: { 
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    showingScanner = true 
                }) {
                    Text(capturedImage == nil ? "Scan Your Space" : "Scan Another Space")
                        .font(.system(size: 13, weight: .bold))
                        .kerning(2)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 24)
                        .background(Color(hex: "#2A2826"))
                        .clipShape(RoundedRectangle(cornerRadius: 32))
                        .shadow(color: Color.black.opacity(0.12), radius: 24, x: 0, y: 12)
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 50)
            }
        }
        .fullScreenCover(isPresented: $showingScanner) {
            ScanView(isPresented: $showingScanner, capturedImage: $capturedImage)
        }
    }
}

// MARK: - Scan Screen
struct ScanView: View {
    @Binding var isPresented: Bool
    @Binding var capturedImage: UIImage?
    @StateObject private var camera = CameraService()
    
    var body: some View {
        ZStack {
            CameraPreview(camera: camera)
                .ignoresSafeArea()
            
            VStack {
                HStack {
                    Button(action: { isPresented = false }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundColor(.white)
                            .padding(14)
                            .background(Color.black.opacity(0.3))
                            .clipShape(Circle())
                    }
                    Spacer()
                }
                .padding(.horizontal, 24)
                .padding(.top, 24)
                
                Spacer()
                
                VStack(spacing: 28) {
                    Text("Capture the chaos")
                        .font(.system(size: 10, weight: .bold))
                        .kerning(4)
                        .foregroundColor(.white.opacity(0.8))
                        .textCase(.uppercase)
                    
                    Button(action: {
                        camera.capturePhoto { image in
                            self.capturedImage = image
                            self.isPresented = false
                        }
                    }) {
                        ZStack {
                            Circle()
                                .stroke(Color.white, lineWidth: 3)
                                .frame(width: 84, height: 84)
                            Circle()
                                .fill(Color.white)
                                .frame(width: 68, height: 68)
                        }
                    }
                }
                .padding(.bottom, 60)
            }
        }
        .onAppear { camera.checkPermissions() }
    }
}

// MARK: - Camera Logic
class CameraService: NSObject, ObservableObject, AVCapturePhotoCaptureDelegate {
    @Published var session = AVCaptureSession()
    private var output = AVCapturePhotoOutput()
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var onCapture: ((UIImage) -> Void)?
    
    func checkPermissions() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            setupSession()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { success in
                if success { self.setupSession() }
            }
        default: break
        }
    }
    
    func setupSession() {
        session.beginConfiguration()
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: device),
              session.canAddInput(input),
              session.canAddOutput(output) else { return }
        
        session.addInput(input)
        session.addOutput(output)
        session.commitConfiguration()
        
        DispatchQueue.global(qos: .userInitiated).async {
            self.session.startRunning()
        }
    }
    
    func capturePhoto(completion: @escaping (UIImage) -> Void) {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        self.onCapture = completion
        let settings = AVCapturePhotoSettings()
        output.capturePhoto(with: settings, delegate: self)
    }
    
    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        guard let data = photo.fileDataRepresentation(), let image = UIImage(data: data) else { return }
        DispatchQueue.main.async {
            self.onCapture?(image)
        }
    }
}

struct CameraPreview: UIViewRepresentable {
    @ObservedObject var camera: CameraService
    
    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: UIScreen.main.bounds)
        camera.setupSession()
        let previewLayer = AVCaptureVideoPreviewLayer(session: camera.session)
        previewLayer.frame = view.frame
        previewLayer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(previewLayer)
        return view
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {}
}

// MARK: - UI Support
struct LogoView: View {
    var body: some View {
        VStack(spacing: 12) {
            Rectangle().frame(width: 60, height: 1)
            Rectangle().frame(width: 45, height: 1)
            Rectangle().frame(width: 30, height: 1)
            Rectangle().frame(width: 20, height: 1)
        }
        .foregroundColor(Color(hex: "#2A2826"))
        .opacity(0.6)
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        default: (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue:  Double(b) / 255, opacity: Double(a) / 255)
    }
}
