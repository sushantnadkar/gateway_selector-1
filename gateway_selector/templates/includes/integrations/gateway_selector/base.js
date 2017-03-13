frappe.provide("frappe.integration_service")
frappe.provide("frappe.gateway_selector")

/* stub class for non embedable gateways, this functions as simple redirection
form implementation */
frappe.gateway_selector._generic_embed = Class.extend({
  init: function(gateway) {
    this.gateway = gateway;
  },

  /**
   * Called when the form is displayed
   */
  show: function() {
    $('#gateway-selector-continue').text("Continue with " + this.gateway.label);
    if ( this.gateway.name.toLowerCase() == "paypal" ) {
      $('#gateway-selector-continue').addClass('paypal');
    }
  },

  /**
   * Called when the form is hidden
   */
  hide: function() {
    if ( this.gateway.name.toLowerCase() == "paypal" ) {
      $('#gateway-selector-continue').removeClass('paypal');
    }

  },

  /**
   * Collects all authnet fields necessary to process payment
   */
  collect: function() {
    // do nothing as this selector is meant to redirect to actual payment gateway
  },

  process: function(data, callback) {
    // trigger payment gateway to use
    frappe.call({
      method: "gateway_selector.gateway_selector.doctype.gateway_selector_settings.gateway_selector_settings.get_url_from_gateway",
      args: {
        data: data,
        gateway: this.gateway.name
      },
      callback: function(data) {
        // redirect to gateway page
        window.location.href = data.message
      }
    })
  }
})

frappe.integration_service.gateway_selector_gateway = Class.extend({

  services: {},
  current_gateway: null,

  init: function() {
  },

  process: function(overrides, callback) {
    if ( this.current_gateway ) {
      this.current_gateway.collect();
      this.current_gateway.process(overrides, callback);
    }
  },

  form: function(request_data) {
    var base = this;
    this.request_data = request_data;
    $(function() {
      frappe.call({
        method: "gateway_selector.gateway_selector.doctype.gateway_selector_settings.gateway_selector_settings.get_gateways",
        freeze: 1,
        args: {},
        callback: function(data) {

          for(var i=0; i < data.message.length; i++) {
            var gateway = data.message[i];
            if ( gateway.is_embedable ) {
              $('#gateway-selector-forms').append('<div id="gateway_option_'+gateway.name+'">'+gateway.embed_form.form+'</div>');
              if ( frappe.gateway_selector[gateway.name + "_embed"] !== undefined ) {
                base.services[gateway.name] = new frappe.gateway_selector[gateway.name + "_embed"]()
              } else {
                base.services[gateway.name] = new frappe.gateway_selector._generic_embed(gateway);
              }

              $('#gateway_option_'+gateway.name).hide();
            } else {
              base.services[gateway.name] = new frappe.gateway_selector._generic_embed(gateway);
            }
          }

          var $active_gateway = $('input:radio[name="gateway_selector_option"]:checked');
          if ( $active_gateway.length > 0 ) {
            base.activate_gateway($active_gateway.val());
          }

          $('#gateway-selector-options').fadeIn('fast');
        }
      })
    });

    $('input:radio[name="gateway_selector_option"]').change(function() {
      if ( $(this).is(':checked') ) {
        base.activate_gateway($(this).val());
      }
    })

    $('#gateway-selector-continue').click(function() {
      base.process(base.request_data, function(err, data) {
        if ( err ) {

        } else {

        }
      })
    })

  },

  activate_gateway: function(name) {
    var gateway = this.services[name];

    // hide previous form
    if ( this.current_gateway ) {
      this.current_gateway.hide();
    }

    // display gateway form
    if ( gateway ) {
      gateway.show();
      this.current_gateway = gateway;
    } else {
      this.current_gateway = null;
    }

    var $gateway_form = $('#gateway_option_' + name);
    // hide all other gateway forms
    $('div[id^=gateway_option_]').not($gateway_form).slideUp('fast');
    // display this gateway form
    $gateway_form.slideDown('fast');
  }

});
