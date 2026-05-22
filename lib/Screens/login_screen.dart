import 'package:flutter/material.dart';
import 'package:rive/rive.dart';
import 'dart:async';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {

  // ── Variables de estado ──────────────────────────────────────────

  // 1.1 FocusNodes: detectan cuándo el usuario entra/sale de cada campo
  final _emailFocusNode    = FocusNode();
  final _passwordFocusNode = FocusNode();

  // 2.1 Controla el recorrido de la mirada del oso (rango 0–100)
  SMINumber? _numLook;

  // 3.1 Timer para detener la mirada al dejar de escribir
  Timer? _typingDebounce;

  // 4.1 Controllers para leer y manipular el texto de cada campo
  final _emailCtrl    = TextEditingController();
  final _passwordCtrl = TextEditingController();

  // 4.2 Mensajes de error que se muestran en la UI
  String? _emailError;
  String? _passwordError;

  // Controla si la contraseña se muestra o se oculta
  bool _obscureText = true;

  // Controladores de la máquina de estados de Rive
  StateMachineController? _controller;
  SMIBool?    _isChecking;
  SMIBool?    _isHandsUp;
  SMITrigger? _trigSuccess;
  SMITrigger? _trigFail;


  // ── Validadores ─────────────────────────────────────────────────

  // 4.3 Verifican si el email y password tienen el formato correcto
  bool isValidEmail(String email) {
    final re = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
    return re.hasMatch(email);
  }

  bool isValidPassword(String pass) {
    // Mínimo 8 caracteres, una mayúscula, una minúscula, un dígito y un especial
    final re = RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$');
    return re.hasMatch(pass);
  }


  // ── Acción del botón Login ───────────────────────────────────────

  // 4.4 Lee los campos, valida y dispara la animación correspondiente
  void _onLogin() {
    final email = _emailCtrl.text.trim();
    final pass  = _passwordCtrl.text;

    // 4.5 Recalcula los errores y notifica a la UI
    setState(() {
      _emailError    = isValidEmail(email)    ? null : 'Email inválido';
      _passwordError = isValidPassword(pass)  ? null
          : 'Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial';
    });

    // 4.6 Cierra el teclado y deja al oso en posición neutral
    FocusScope.of(context).unfocus();
    _typingDebounce?.cancel();
    _isChecking?.change(false);
    _isHandsUp?.change(false);
    _numLook?.value = 50.0;

    // 4.7 Dispara el trigger según el resultado de la validación
    if (_emailError == null && _passwordError == null) {
      _trigSuccess?.fire();
    } else {
      _trigFail?.fire();
    }
  }


  // ── initState ───────────────────────────────────────────────────

  // 1.2 Listeners: reaccionan cuando el foco cambia entre campos
  @override
  void initState() {
    super.initState();

    _emailFocusNode.addListener(() {
      if (_emailFocusNode.hasFocus) {
        _isHandsUp?.change(false);
        _isChecking?.change(true);   // el oso empieza a mirar
      } else {
        _isChecking?.change(false);
        _numLook?.value = 50.0;      // mirada neutral al salir del campo
      }
    });

    _passwordFocusNode.addListener(() {
      if (_passwordFocusNode.hasFocus) {
        _isChecking?.change(false);
        _isHandsUp?.change(true);    // el oso se tapa los ojos
      }
    });
  }


  // ── Build ────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final Size size = MediaQuery.of(context).size;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            children: [

              // Animación Rive del oso
              SizedBox(
                width: size.width,
                height: 200,
                child: RiveAnimation.asset(
                  'assets/animated_login_bear.riv',
                  stateMachines: const ['Login Machine'],
                  onInit: (artboard) {

                    // Conecta los inputs de Rive con las variables del estado
                    final controller = StateMachineController.fromArtboard(
                      artboard, 'Login Machine',
                    );
                    if (controller == null) return;

                    artboard.addController(controller);
                    _controller  = controller;
                    _isChecking  = controller.findSMI('isChecking')  as SMIBool?;
                    _isHandsUp   = controller.findSMI('isHandsUp')   as SMIBool?;
                    _trigSuccess = controller.findSMI('trigSuccess')  as SMITrigger?;
                    _trigFail    = controller.findSMI('trigFail')     as SMITrigger?;
                    _numLook     = controller.findSMI('numLook')      as SMINumber?;
                  },
                ),
              ),

              const SizedBox(height: 20),

              // 1.3 Campo de email con su FocusNode asignado
              TextField(
                controller: _emailCtrl,
                focusNode: _emailFocusNode,
                onChanged: (value) {
                  if (value.isNotEmpty) {
                    _isHandsUp?.change(false);
                    _isChecking?.change(true);

                    // 2.4 Mueve los ojos según la longitud del texto (0–100)
                    final look = (value.length / 80.0 * 100.0).clamp(0.0, 100.0);
                    _numLook?.value = look;

                    // 3.3 Debounce: reinicia el timer cada vez que el usuario escribe
                    _typingDebounce?.cancel();
                    _typingDebounce = Timer(const Duration(seconds: 3), () {
                      if (!mounted) return;
                      _isChecking?.change(false);
                    });
                  } else {
                    _isChecking?.change(false);
                  }
                },
                decoration: InputDecoration(
                  errorText: _emailError,
                  hintText: 'Email',
                  prefixIcon: const Icon(Icons.email),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),

              const SizedBox(height: 15),

              // 1.3 Campo de password con su FocusNode asignado
              TextField(
                controller: _passwordCtrl,
                focusNode: _passwordFocusNode,
                obscureText: _obscureText,
                onChanged: (value) {
                  _isChecking?.change(false);
                  _isHandsUp?.change(true);
                },
                decoration: InputDecoration(
                  errorText: _passwordError,
                  hintText: 'Password',
                  prefixIcon: const Icon(Icons.lock),
                  // Botón para mostrar/ocultar la contraseña
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscureText ? Icons.visibility : Icons.visibility_off,
                    ),
                    onPressed: () {
                      setState(() => _obscureText = !_obscureText);
                    },
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),

              const SizedBox(height: 10),

              // Enlace de "¿olvidaste tu contraseña?"
              SizedBox(
                width: size.width,
                child: const Text(
                  'Forgot Password?',
                  textAlign: TextAlign.right,
                  style: TextStyle(decoration: TextDecoration.underline),
                ),
              ),

              const SizedBox(height: 20),

              // Botón principal de Login
              MaterialButton(
                minWidth: size.width,
                height: 50,
                color: Colors.amber,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                onPressed: _onLogin,
                child: const Text(
                  'Login',
                  style: TextStyle(color: Colors.white),
                ),
              ),

              const SizedBox(height: 20),

              // Enlace para ir al registro
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text("Don't have an account?"),
                  TextButton(
                    onPressed: () {},
                    child: const Text(
                      'Register',
                      style: TextStyle(
                        color: Colors.blue,
                        decoration: TextDecoration.underline,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),

            ],
          ),
        ),
      ),
    );
  }


  // ── Dispose ──────────────────────────────────────────────────────

  // 1.4 Libera memoria y recursos al salir de la pantalla
  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _emailFocusNode.dispose();
    _passwordFocusNode.dispose();
    _typingDebounce?.cancel();
    super.dispose();
  }
}